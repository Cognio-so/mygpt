import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { useNavigate, useActionData, useNavigation, useLoaderData } from "@remix-run/react";
import AdminLayout from "~/components/admin/AdminLayout";
import CreateCustomGpt from "~/components/admin/CreateCustomGpt";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { createR2Uploader } from "~/lib/r2-upload.server";
import type { FileAttachment } from "~/lib/database.types";

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

          // Parse knowledge base from JSON string
          let knowledgeFiles: FileAttachment[] = [];
          if (gptData.knowledge_base) {
            try {
              knowledgeFiles = JSON.parse(gptData.knowledge_base);
            } catch (error) {
              console.error('Error parsing knowledge base:', error);
            }
          }

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
              knowledge_base: gptData.knowledge_base,
              knowledgeFiles: knowledgeFiles,
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
    headers: {
      ...response.headers,
      'Cache-Control': 'private, max-age=300',
    },
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
    const formData = await request.formData();
    const intent = formData.get('intent') as string;
    const gptId = formData.get('gptId') as string;

    // Extract form values
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    let instructions = formData.get('instructions') as string;
    const model = formData.get('model') as string;
    const conversationStarter = formData.get('conversationStarter') as string || null;
    const webBrowsing = formData.get('webBrowsing') === 'on';
    const folder = formData.get('folder') as string || null; // Add folder extraction

    // Add form validation early to avoid unnecessary processing
    if (!name?.trim() || !description?.trim() || !instructions?.trim()) {
      return json({
        error: 'Name, description, and instructions are required.',
      }, { 
        status: 400,
        headers: response.headers
      });
    }

    // Validate file size before processing
    const profileImage = formData.get('profileImage');
    if (profileImage instanceof File && profileImage.size > 5 * 1024 * 1024) {
      return json({
        error: 'Profile image must be less than 5MB',
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

    // Handle file uploads first
    const knowledgeFiles = formData.getAll('knowledgeFiles') as File[];
    console.log("🔍 CreateGPT: Raw knowledge files from FormData:", knowledgeFiles);

    // Enhanced logging for each file
    knowledgeFiles.forEach((file, index) => {
      console.log(`🔍 CreateGPT: Raw file ${index + 1}:`, {
        file: file,
        name: file?.name,
        size: file?.size,
        type: file?.type,
        constructor: file?.constructor?.name,
        isFile: file instanceof File,
        isEmptyFile: file instanceof File && file.size === 0,
        hasName: !!(file?.name),
        hasSize: !!(file?.size),
      });
    });

    const validKnowledgeFiles = knowledgeFiles.filter(file => {
      const isValid = file instanceof File && file.size > 0 && file.name;
      console.log(`🔍 CreateGPT: File validation for "${file?.name}":`, {
        isFile: file instanceof File,
        hasSize: file?.size > 0,
        hasName: !!file?.name,
        actualSize: file?.size,
        isValid: isValid
      });
      return isValid;
    });

    const existingKnowledgeFiles = formData.get('existingKnowledgeFiles') as string;
    
    console.log("📁 CreateGPT: Knowledge files processing:", {
      totalKnowledgeFiles: knowledgeFiles.length,
      validKnowledgeFiles: validKnowledgeFiles.length,
      hasExistingFiles: !!existingKnowledgeFiles
    });

    validKnowledgeFiles.forEach((file, index) => {
      console.log(`📄 CreateGPT: Knowledge file ${index + 1}:`, {
        name: file.name,
        size: file.size,
        type: file.type
      });
    });

    let knowledgeBaseData: FileAttachment[] = [];
    
    // Parse existing knowledge files
    if (existingKnowledgeFiles) {
      try {
        knowledgeBaseData = JSON.parse(existingKnowledgeFiles);
        console.log("📚 CreateGPT: Parsed existing knowledge files:", knowledgeBaseData.length);
      } catch (error) {
        console.error('❌ CreateGPT: Error parsing existing knowledge files:', error);
      }
    }

    // Upload new files if any
    if (validKnowledgeFiles.length > 0) {
      console.log("⬆️ CreateGPT: Starting knowledge files upload...");
      for (let i = 0; i < validKnowledgeFiles.length; i++) {
        const file = validKnowledgeFiles[i];
        try {
          console.log(`⬆️ CreateGPT: Uploading knowledge file ${i + 1}/${validKnowledgeFiles.length}:`, file.name);
          const fileUrl = await r2Uploader.uploadFile(file, 'knowledge-files');
          console.log(`✅ CreateGPT: Knowledge file ${i + 1} uploaded:`, fileUrl);
          
          knowledgeBaseData.push({
            name: file.name,
            url: fileUrl,
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString()
          });
        } catch (error) {
          console.error(`❌ CreateGPT: Error uploading knowledge file ${file.name}:`, error);
          throw error;
        }
      }
    }

    console.log("📚 CreateGPT: Final knowledge base data:", {
      filesCount: knowledgeBaseData.length,
      totalSize: knowledgeBaseData.reduce((sum, file) => sum + file.size, 0)
    });

    // Safety check for knowledge base data
    let knowledgeBaseString: string | null = null;
    if (knowledgeBaseData.length > 0) {
      try {
        knowledgeBaseString = JSON.stringify(knowledgeBaseData);
        console.log("📚 CreateGPT: Successfully stringified knowledge base data");
      } catch (stringifyError) {
        console.error("❌ CreateGPT: Error stringifying knowledge base:", stringifyError);
        knowledgeBaseString = null;
      }
    }

    console.log("📚 CreateGPT: Final knowledge base string:", {
      isNull: knowledgeBaseString === null,
      length: knowledgeBaseString?.length || 0,
      startsWithBracket: knowledgeBaseString?.startsWith('['),
      preview: knowledgeBaseString?.substring(0, 100)
    });

    if (intent === 'update' && gptId) {
      console.log("🔄 CreateGPT: Updating GPT with ID:", gptId);
      
      // Ensure knowledge_base is properly stringified
      const knowledgeBaseString = knowledgeBaseData.length > 0 ? JSON.stringify(knowledgeBaseData) : null;
      console.log("📚 CreateGPT: Knowledge base string to save:", knowledgeBaseString?.substring(0, 200) + "...");

      // Update existing GPT
      const { error: updateError } = await supabase.rpc('update_custom_gpt', {
        gpt_id: gptId,
        user_id_param: user.id,
        name_param: name,
        description_param: description,
        instructions_param: instructions,
        model_param: model,
        conversation_starter_param: conversationStarter,
        web_browsing_param: webBrowsing,
        folder_param: folder,
        image_url_param: imageUrl,
        knowledge_base_param: knowledgeBaseString
      });

      if (updateError) {
        console.error('❌ CreateGPT: Error updating GPT:', updateError);
        throw updateError;
      } else {
        console.log('✅ CreateGPT: GPT updated successfully');
      }
    } else if (intent === 'create') {
      console.log("➕ CreateGPT: Creating new GPT");
      
      // Ensure knowledge_base is properly stringified
      const knowledgeBaseString = knowledgeBaseData.length > 0 ? JSON.stringify(knowledgeBaseData) : null;
      console.log("📚 CreateGPT: Knowledge base string to save:", knowledgeBaseString?.substring(0, 200) + "...");

      // Create new GPT
      const { error: insertError } = await supabase
        .from('custom_gpts')
        .insert({
          user_id: user.id,
          name,
          description,
          instructions,
          model,
          conversation_starter: conversationStarter,
          web_browsing: webBrowsing,
          folder,
          image_url: imageUrl,
          knowledge_base: knowledgeBaseString, // Use the properly stringified version
          is_public: false,
          is_featured: false,
          view_count: 0,
          like_count: 0,
        });

      if (insertError) {
        console.error('❌ CreateGPT: Error creating GPT:', insertError);
        throw insertError;
      } else {
        console.log('✅ CreateGPT: GPT created successfully');
      }
    }

    return redirect('/admin');
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