import { json, type MetaFunction } from '@remix-run/cloudflare';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import { AnimatedBackground } from '~/components/background/AnimatedBackground';

export const meta: MetaFunction = () => {
  return [{ title: 'Steve - AI Coding Assistant' }, { name: 'description', content: 'Talk with Steve, your enhanced AI coding assistant' }];
};

export const loader = () => json({});

/**
 * Landing page component for Steve
 * Note: Settings functionality should ONLY be accessed through the sidebar menu.
 * Do not add settings button/panel to this landing page as it was intentionally removed
 * to keep the UI clean and consistent with the design system.
 */
export default function Index() {
  return (
    <div className="relative flex flex-col h-full w-full bg-zinc-950">
      {/* Premium animated background */}
      <AnimatedBackground
        className="absolute inset-0"
        numSquares={50}
        maxOpacity={0.1}
        duration={8}
        colors={['#9333ea', '#ec4899', '#06b6d4', '#10b981']}
      />
      
      {/* Content with proper z-index */}
      <div className="relative z-10">
        <Header />
        <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
      </div>
    </div>
  );
}
