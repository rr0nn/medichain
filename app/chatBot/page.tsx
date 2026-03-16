"use client";

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";

import { ArrowUp, SquarePlus, ChevronRight, Pill  } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Chat() {
    const [input, setInput] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const { messages, sendMessage } = useChat();
    const router = useRouter();

  return (
    <div className="flex flex-col w-full max-w-2xl py-24 pb-32 mx-auto stretch ">
        <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="fixed top-3.5 left-5 z-50 text-[28px] cursor-pointer"
        >
            ☰ 
        </button>
       
        <Conversation>
            <ConversationContent>
                {messages.length === 0 ? (
                <ConversationEmptyState
                    title="Start a conversation"
                    description="Type a message below to begin chatting"
                />
                ) : (
                messages.map((message) => (
                    <Message from={message.role} key={message.id} >
                    <MessageContent 
                        className={message.role === "user"
                            ? "!bg-[#1BC2BD] !text-white self-end p-2 rounded-lg mb-2"
                            : "bg-gray-100 text-black self-start p-2 rounded-lg mb-2"
                        }
                    >
                        {message.parts.map((part, i) => {
                        switch (part.type) {
                            case "text":
                            return (
                                <MessageResponse key={`${message.id}-${i}`}>
                                {part.text}
                                </MessageResponse>
                            );
                            default:
                            return null;
                        }
                        })}
                    </MessageContent>
                    </Message>
                ))
                )}
            </ConversationContent>
            <ConversationScrollButton />
            </Conversation>

        <form
            className="fixed bottom-0 w-full max-w-161 flex gap-2"
            onSubmit={e => {
            e.preventDefault();
            sendMessage({ text: input });
            setInput('');
            }}
        >
            <input
            className="dark:bg-zinc-900 bottom-0 w-full mx-auto left-0 right-0 p-4.5 mb-8 border border-zinc-300 dark:border-zinc-800 rounded-3xl shadow-xl bg-white"
            value={input}
            placeholder="Say something..."
            onChange={e => setInput(e.currentTarget.value)}
            />
            <button
                type="submit"
                className="absolute flex items-center right-3 bottom-11.5 px-1.5 py-1 bg-[#1B7D7E] text-white rounded-full w-8 h-8 cursor-pointer"
                ><ArrowUp />
            </button>
        </form>
        
        <div
            className={`fixed  top-0 left-0 h-full w-70 bg-[#1BC2BD]/12 shadow-lg transform transition-transform duration-300
                ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
           <button
                //onClick={createNewChat}
                onClick={() => {
                    setInput("");
                }}
                className="flex gap-2 items-center w-full text-[16px] text-left p-4 mt-20 hover:bg-white cursor-pointer "
            > <SquarePlus size={16} />  New Chat
            </button>
          <Link
                href="/finalresult"
                className="flex gap-2 items-center w-full text-[16px] text-left p-4 mt-0 hover:bg-white cursor-pointer"
            > <Pill size={16} /> Diagnosis Output
            </Link>
            <button
                className="flex gap-2 items-center w-full text-[16px] text-left p-4 mt-0 hover:bg-white cursor-pointer"
            > Your chats <ChevronRight size={16} />
            </button>
            <div className="absolute top-0 left-70 h-full w-[1px] bg-gray-200">
              </div>
        </div>

         <div className='fixed top-3 left-20 bg-[#1B7D7E] text-[18px] font-bold text-white p-2 px-4 rounded-3xl'>
            MediChain
            </div>
    </div>
  );
}