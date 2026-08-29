import { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import {
  ChatComposer,
  ChatMessageList,
  ChatMessage,
  ChatMessageBubble,
} from '@astryxdesign/core/Chat';
import { Layout, LayoutContent, LayoutFooter, LayoutHeader, VStack } from '@astryxdesign/core/Layout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Text } from '@astryxdesign/core/Text';

type Message = {
  id: string;
  sender: 'user' | 'assistant';
  text?: string;
  imageBytes?: string;
};

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSend = async (value: string) => {
    if (!value.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: value };
    setMessages((prev) => [...prev, userMsg]);

    if (!apiKey) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), sender: 'assistant', text: 'Please enter a Gemini API Key first.' },
      ]);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });

      if (value.startsWith('/image ')) {
        const prompt = value.replace('/image ', '').trim();
        const response = await ai.models.generateImages({
          model: 'gemini-3.1-flash-lite-image',
          prompt: prompt,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
          },
        });

        const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;

        if (imageBytes) {
          setMessages((prev) => [
            ...prev,
            { id: Date.now().toString(), sender: 'assistant', imageBytes },
          ]);
        } else {
           setMessages((prev) => [
            ...prev,
            { id: Date.now().toString(), sender: 'assistant', text: 'Failed to generate image.' },
          ]);
        }
      } else {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: value,
        });

        if (response.text) {
          setMessages((prev) => [
            ...prev,
            { id: Date.now().toString(), sender: 'assistant', text: response.text },
          ]);
        } else {
           setMessages((prev) => [
            ...prev,
            { id: Date.now().toString(), sender: 'assistant', text: 'No text response received.' },
          ]);
        }
      }
    } catch (error: any) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), sender: 'assistant', text: `Error: ${error.message}` },
      ]);
    }
  };

  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader>
          <VStack gap={2} padding={4}>
            <Text weight="semibold">Personal Assistant</Text>
            <TextInput
              label="API Key"
              placeholder="Enter Gemini API Key..."
              value={apiKey}
              onChange={setApiKey}
              type="password"
            />
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={4}>
          <ChatMessageList density="balanced">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} sender={msg.sender}>
                <ChatMessageBubble>
                  {msg.imageBytes ? (
                    <img
                      src={`data:image/jpeg;base64,${msg.imageBytes}`}
                      alt="Generated image"
                      style={{ maxWidth: '100%' }}
                    />
                  ) : (
                    msg.text
                  )}
                </ChatMessageBubble>
              </ChatMessage>
            ))}
          </ChatMessageList>
        </LayoutContent>
      }
      footer={
        <LayoutFooter>
          <VStack padding={4} width="100%">
            <ChatComposer
              placeholder="Message Gemini... (type /image to generate an image)"
              onSubmit={handleSend}
            />
          </VStack>
        </LayoutFooter>
      }
    />
  );
}
