import React from 'react';
import { FiGlobe } from 'react-icons/fi';
import { TbRouter } from 'react-icons/tb';
import { RiOpenaiFill } from 'react-icons/ri';
import { SiOpenai, SiGooglegemini } from 'react-icons/si';
import { FaRobot } from 'react-icons/fa6';
import { BiLogoMeta } from 'react-icons/bi';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';

type AdminCardProps = {
    gpt: {
        _id: string;
        name: string;
        description?: string;
        imageUrl?: string;
        model?: string;
        capabilities?: { webBrowsing?: boolean };
        createdAt?: string;
    };
    onClick?: () => void;
    hideActionIcons?: boolean;
};

const modelIcons: Record<string, JSX.Element> = {
    'openrouter/auto': <TbRouter className="text-yellow-500" size={18} />,
    'GPT-4o': <RiOpenaiFill className="text-green-500" size={18} />,
    'GPT-4o-mini': <SiOpenai className="text-green-400" size={16} />,
    'Gemini-flash-2.5': <SiGooglegemini className="text-blue-400" size={16} />,
    'Gemini-pro-2.5': <SiGooglegemini className="text-blue-600" size={16} />,
    'Claude 3.5 Haiku': <FaRobot className="text-purple-400" size={16} />,
    'llama3-8b-8192': <BiLogoMeta className="text-blue-500" size={18} />,
    'Llama 4 Scout': <BiLogoMeta className="text-blue-700" size={18} />
};

const AdminCard: React.FC<AdminCardProps> = ({
    gpt,
    onClick,
    hideActionIcons
}) => {

    return (
        <Card 
            className="overflow-hidden cursor-pointer transition-all hover:shadow-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            onClick={onClick}
        >
            <div className="h-32  sm:h-36 relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-300 dark:from-gray-700 dark:to-gray-900">
                {gpt.imageUrl ? (
                    <div className="w-full h-full overflow-hidden">
                        <img 
                            src={gpt.imageUrl}  
                            alt={gpt.name} 
                            className="w-full h-full object-cover object-center"
                            style={{ objectPosition: 'center' }}
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.style.display = 'none';
                            }}
                        />
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50/50 to-purple-100/50 dark:from-blue-900/30 dark:to-purple-900/30">
                        <span className="text-3xl sm:text-4xl text-gray-500/40 dark:text-white/30">{gpt.name.charAt(0)}</span>
                    </div>
                )}
            </div>
            <CardHeader className="p-4 pb-0">
                <CardTitle className="font-medium text-base truncate text-gray-900 dark:text-white">{gpt.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
                {gpt.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{gpt.description}</p>
                )}
                
                {gpt.model && (
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {modelIcons[gpt.model] && (
                            <span className="mr-1">{modelIcons[gpt.model]}</span>
                        )}
                        <span>{gpt.model}</span>
                    </div>
                )}
                
                {gpt.capabilities?.webBrowsing && (
                    <div className="flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400 mb-2">
                        <FiGlobe size={12} />
                        <span>Web search</span>
                    </div>
                )}

                {gpt.createdAt && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        Created: {new Date(gpt.createdAt).toLocaleDateString()}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default AdminCard;