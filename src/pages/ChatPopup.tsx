import React from 'react';
import GoalChatWidget from '@/components/goal/GoalChatWidget';
import { useLoaderData, useParams } from '@tanstack/react-router';

function parseUserInfo(userInfoParam: string | null): any {
    if (!userInfoParam) return null;
    try {
        return JSON.parse(decodeURIComponent(userInfoParam));
    } catch {
        return null;
    }
}


const ChatPopup: React.FC = () => {
    const loaderData = useLoaderData({ from: '/chat-popup/' }) as any;
    const userInfo = parseUserInfo(loaderData?.userInfo);
    const goalId = loaderData?.goalId || '';

    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="w-full max-w-lg mx-auto">
                <GoalChatWidget goalId={goalId} userInfo={userInfo} />
            </div>
        </div>
    );
};

export default ChatPopup;
