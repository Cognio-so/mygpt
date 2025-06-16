import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { useNavigate, useActionData, useNavigation, useLoaderData } from "@remix-run/react";
import AdminLayout from "~/components/admin/AdminLayout";
import CreateCustomGpt from "~/components/admin/CreateCustomGpt";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { createR2Uploader } from "~/lib/r2-upload.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const env = context.cloudflare.env;
    const { supabase, response } = createSupabaseServerClient(request, env);
    
    const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
      return redirect('/login', {
        headers: response.headers,
      });
    }

  // Check for edit mode and load existing GPT data
  const url = new URL(request.url);
  const mode = url.searchParams.get('mode');
  const editId = url.searchParams.get('id');
  
  let initialData = null;
  
  if (mode === 'edit' && editId) {
      try {
          // Fetch the existing GPT data
          const { data: gptData, error: gptError } = await supabase
              .from('custom_gpts')
              .select('*')
              .eq('id', editId)
              .eq('user_id', user.id)
              .single();

          if (gptError) {
              console.error('Error fetching GPT for editing:', gptError);
              return redirect('/admin', {
                  headers: response.headers,
              });
          }

          // Fetch knowledge files for this GPT
          const { data: knowledgeFiles } = await supabase
              .from('knowledge_files')
              .select('*')
              .eq('gpt_id', editId);

          initialData = {
              id: gptData.id,
              name: gptData.name,
              description: gptData.description,
              instructions: gptData.instructions,
              model: gptData.model,
              conversationStarter: gptData.conversation_starter,
              webBrowsing: gptData.web_browsing,
              imageUrl: gptData.image_url,
              folder: gptData.folder,
              knowledgeFiles: knowledgeFiles || [],
          };
      } catch (error) {
          console.error('Error loading GPT data for editing:', error);
          return redirect('/admin', {
              headers: response.headers,
          });
      }
  }
  
  return json({
    user,
    initialData,
    editGptId: editId,
  }, {
    headers: response.headers,
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env;
  const { supabase, response } = createSupabaseServerClient(request, env);
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json({
      error: "You must be logged in to create a GPT."
    }, { 
      status: 401, 
      headers: response.headers 
    });
  }

  try {
    // Parse the form data
    const formData = await request.formData();
    const intent = formData.get('intent') as string;
    const gptId = formData.get('gptId') as string; // Get gptId from form data

    // Extract form values
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    let instructions = formData.get('instructions') as string;
    const model = formData.get('model') as string;
    const conversationStarter = formData.get('conversationStarter') as string || null;
    const webBrowsing = formData.get('webBrowsing') === 'on';

    // Validate required fields
    if (!name || !description || !instructions) {
      return json({
        error: 'Name, description, and instructions are required.',
      }, { 
        status: 400,
        headers: response.headers
      });
    }

    // Check if instructions are too long
    if (instructions && instructions.length > 50000) {
      instructions = instructions.substring(0, 50000);
      console.log("Instructions truncated to 50000 characters");
    }

    // Initialize R2 uploader
    const r2Uploader = createR2Uploader(env);
    let imageUrl: string | null = null;

    // Handle profile image upload
    const profileImage = formData.get('profileImage');
    if (profileImage instanceof File && profileImage.size > 0) {
      try {
        console.log("Uploading profile image:", profileImage.name, profileImage.size);
        imageUrl = await r2Uploader.uploadFile(profileImage, 'gpt-images');
        console.log("Profile image uploaded successfully:", imageUrl);
      } catch (uploadError) {
        console.error("Error uploading profile image:", uploadError);
        return json({
          error: `Failed to upload profile image: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`,
        }, { 
          status: 500,
          headers: response.headers
        });
      }
    }

    if (intent === 'update' && gptId) {
      console.log("Updating GPT with ID:", gptId);

      // Prepare update data
      const updateData: any = {
          name,
          description,
          instructions,
          model: model || 'openrouter/auto',
          conversation_starter: conversationStarter,
          web_browsing: webBrowsing,
      };

      // Only update image_url if a new image was uploaded
      if (imageUrl) {
          updateData.image_url = imageUrl;
      }

      // Update the GPT record
      const { error: updateError } = await supabase
          .from('custom_gpts')
          .update(updateData)
          .eq('id', gptId)
          .eq('user_id', user.id);

      if (updateError) {
          console.error("Update error:", updateError);
          
          // Clean up uploaded image if update fails
          if (imageUrl) {
              try {
                  await r2Uploader.deleteFile(imageUrl);
              } catch (cleanupError) {
                  console.error("Error cleaning up uploaded image:", cleanupError);
              }
          }
          
          return json({
              error: `Error updating GPT: ${updateError.message || "Unknown database error"}`,
              details: updateError
          }, { 
              status: 500,
              headers: response.headers
          });
      }

      // Handle knowledge files upload for update
      const knowledgeFiles = formData.getAll('knowledgeFiles') as File[];
      const validKnowledgeFiles = knowledgeFiles.filter(file => file instanceof File && file.size > 0);

      if (validKnowledgeFiles.length > 0) {
          try {
              console.log(`Uploading ${validKnowledgeFiles.length} new knowledge files`);
              
              // Upload all new knowledge files
              const uploadPromises = validKnowledgeFiles.map(async (file) => {
                  try {
                      const fileUrl = await r2Uploader.uploadFile(file, 'knowledge-files');
                      
                      // Insert file record into database
                      const { error: fileError } = await supabase
                          .from('knowledge_files')
                          .insert({
                              gpt_id: gptId,
                              file_name: file.name,
                              file_url: fileUrl,
                              file_size: file.size,
                              file_type: file.type,
                              upload_status: 'completed'
                          });

                      if (fileError) {
                          console.error(`Error saving file record for ${file.name}:`, fileError);
                          // Try to clean up the uploaded file
                          try {
                              await r2Uploader.deleteFile(fileUrl);
                          } catch (cleanupError) {
                              console.error("Error cleaning up file:", cleanupError);
                          }
                          throw fileError;
                      }

                      return { fileName: file.name, fileUrl };
                  } catch (error) {
                      console.error(`Error uploading file ${file.name}:`, error);
                      throw error;
                  }
              });

              const uploadResults = await Promise.all(uploadPromises);
              console.log("All new knowledge files uploaded successfully:", uploadResults);
          } catch (filesError) {
              console.error("Error uploading knowledge files:", filesError);
              // Don't fail the entire operation for file upload errors
          }
      }

      console.log("GPT updated successfully with ID:", gptId);

      // Redirect to admin dashboard on success
      return redirect('/admin', {
          headers: response.headers
      });
    } else if (intent === 'create') {
      console.log("Creating GPT with data:", {
        user_id: user.id,
        name,
        description,
        model,
        instructions_length: instructions?.length || 0
      });

      // Step 1: Insert the GPT record
      const { data: insertedData, error: insertError } = await supabase.from('custom_gpts').insert([
        {
          user_id: user.id,
          name,
          description,
          instructions,
          model: model || 'openrouter/auto',
          conversation_starter: conversationStarter,
          web_browsing: webBrowsing,
          image_url: imageUrl,
        }
      ]);

      if (insertError) {
        console.error("Insert error:", insertError);
        
        // Clean up uploaded image if GPT creation fails
        if (imageUrl) {
          try {
            await r2Uploader.deleteFile(imageUrl);
          } catch (cleanupError) {
            console.error("Error cleaning up uploaded image:", cleanupError);
          }
        }
        
        return json({
          error: `Error creating GPT: ${insertError.message || "Unknown database error"}`,
          details: insertError
        }, { 
          status: 500,
          headers: response.headers
        });
      }

      // Step 2: Get the created GPT ID
      const { data: gptData, error: selectError } = await supabase
        .from('custom_gpts')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('name', name)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (selectError || !gptData) {
        console.error("Error fetching created GPT:", selectError);
        // Continue anyway since insert succeeded
      }

      const createdGptId = gptData?.id;

      // Step 3: Handle knowledge files upload
      const knowledgeFiles = formData.getAll('knowledgeFiles') as File[];
      const validKnowledgeFiles = knowledgeFiles.filter(file => file instanceof File && file.size > 0);

      if (validKnowledgeFiles.length > 0 && createdGptId) {
        try {
          console.log(`Uploading ${validKnowledgeFiles.length} knowledge files`);
          
          // Upload all knowledge files
          const uploadPromises = validKnowledgeFiles.map(async (file) => {
            try {
              const fileUrl = await r2Uploader.uploadFile(file, 'knowledge-files');
              
              // Insert file record into database
              const { error: fileError } = await supabase
                .from('knowledge_files')
                .insert({
                  gpt_id: createdGptId,
                  file_name: file.name,
                  file_url: fileUrl,
                  file_size: file.size,
                  file_type: file.type,
                  upload_status: 'completed'
                });

              if (fileError) {
                console.error(`Error saving file record for ${file.name}:`, fileError);
                // Try to clean up the uploaded file
                try {
                  await r2Uploader.deleteFile(fileUrl);
                } catch (cleanupError) {
                  console.error("Error cleaning up file:", cleanupError);
                }
                throw fileError;
              }

              return { fileName: file.name, fileUrl };
            } catch (error) {
              console.error(`Error uploading file ${file.name}:`, error);
              throw error;
            }
          });

          const uploadResults = await Promise.all(uploadPromises);
          console.log("All knowledge files uploaded successfully:", uploadResults);
        } catch (filesError) {
          console.error("Error uploading knowledge files:", filesError);
          // Don't fail the entire operation for file upload errors
          // The GPT was created successfully
        }
      }

      console.log("GPT created successfully with ID:", createdGptId);

      // Redirect to admin dashboard on success
      return redirect('/admin', {
        headers: response.headers
      });
    }

    return json({
      error: "Invalid intent.",
    }, { 
      status: 400,
      headers: response.headers
    });

  } catch (error: any) {
    console.error('Uncaught action error:', error);
    
    return json({
      error: `An unexpected error occurred: ${error.message || "Unknown error"}`,
      details: error
    }, { 
      status: 500,
      headers: response.headers
    });
  }
}

export default function CreateGptPage() {
  const navigate = useNavigate();
  const { initialData, editGptId } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const handleGoBack = () => {
    navigate('/admin');
  };

  return (
    <CreateCustomGpt
      onGoBack={handleGoBack}
      editGptId={editGptId}
      onGptCreated={() => navigate('/admin')}
      actionData={actionData}
      isSubmitting={isSubmitting}
      initialData={initialData}
    />
  );
}