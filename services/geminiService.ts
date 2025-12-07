import { GoogleGenAI, Type, Modality } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// --- Text Generation (Minutes) ---
export const generateMeetingMinutes = async (
  formData: Record<string, any>
): Promise<string> => {
  const prompt = `
    You are a professional secretary for a Family Club. 
    Create formal meeting minutes based on the following raw data:
    ${JSON.stringify(formData, null, 2)}
    
    Format the output as a clean, professional Markdown document. 
    Include sections for: 
    - Opening (Date, Venue, Host)
    - Attendance & Apologies
    - Agenda
    - Finances
    - Matters Arising
    - New Matters
    - Announcements
    - Next Meeting
    - Closure
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Using Pro for complex reasoning/formatting
      contents: prompt,
    });
    return response.text || "Failed to generate minutes.";
  } catch (error) {
    console.error("Error generating minutes:", error);
    throw error;
  }
};

// --- Vision (Document Analysis) ---
export const analyzeDocument = async (base64Image: string, mimeType: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Required for high quality vision
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image
            }
          },
          {
            text: `Analyze this document. 
            
            PART 1: SUMMARY
            Provide a clear, structured Markdown summary of the document. If it is a bank statement or financial record, identify the period, opening/closing balances, and key observations.
            
            PART 2: EXTRACTION
            Identify and EXTRACT all transactions that look like member contributions. 
            Rules for extraction:
            - **Post Date**: The transaction date (YYYY-MM-DD).
            - **Payment Method**: 
              - Classify as "Cash" if description contains: "CASH DEPOSIT", "AUTOBANK CASH", "AUTOCASH".
              - Classify as "EFT" if description contains: "IB PAYMENT", "STOP ORDER", "EFT", "ONLINE", "TRANSFER".
            - **Member Name**: Extract the person's name from the description (e.g., from "IB PAYMENT FROM JOHN DOE", extract "John Doe"). Clean up the name (Title Case, remove account numbers or codes). If no name is clearly visible, return null.
            - **Amount**: The transaction amount (positive number).
            - **Type**: "Contribution" if it appears to be a member payment, "Other" otherwise.

            CRITICAL: Return the extracted data as a JSON array at the very END of your response. 
            Wrap the JSON block in triple backticks labeled 'json' exactly like this:
            \`\`\`json
            [
              {
                "date": "2024-01-25",
                "description": "Raw description text",
                "amount": 500.00,
                "memberName": "John Doe",
                "paymentMethod": "EFT",
                "type": "Contribution"
              }
            ]
            \`\`\`
            `
          }
        ]
      }
    });
    return response.text || "Could not analyze document.";
  } catch (error) {
    console.error("Error analyzing document:", error);
    throw error;
  }
};

// --- Chat with Search & Maps Grounding ---
export const sendMessageToAssistant = async (
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  message: string,
  useGrounding: 'none' | 'search' | 'maps' = 'none',
  location?: { lat: number; lng: number },
  systemInstruction?: string
) => {
  try {
    const model = useGrounding === 'none' ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';
    
    const tools: any[] = [];
    if (useGrounding === 'search') {
      tools.push({ googleSearch: {} });
    } else if (useGrounding === 'maps') {
      tools.push({ googleMaps: {} });
    }

    const config: any = {
      tools: tools.length > 0 ? tools : undefined,
    };
    
    if (systemInstruction) {
        config.systemInstruction = systemInstruction;
    }

    if (useGrounding === 'maps' && location) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: location.lat,
            longitude: location.lng
          }
        }
      };
    }

    const chat = ai.chats.create({
      model: model,
      history: history,
      config: config
    });

    const result = await chat.sendMessage({ message });
    
    // Extract grounding metadata
    let searchLinks: { uri: string; title: string }[] = [];
    let mapLinks: { uri: string; title: string }[] = [];

    const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (groundingChunks) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web) {
          searchLinks.push({ uri: chunk.web.uri, title: chunk.web.title });
        }
        if (chunk.maps?.googleMapsItem?.metadata?.placeUri) {
           mapLinks.push({ 
             uri: chunk.maps.googleMapsItem.metadata.placeUri, 
             title: chunk.maps.googleMapsItem.place?.name || "Map Location" 
           });
        }
      });
    }

    return {
      text: result.text,
      groundingMetadata: {
        search: searchLinks,
        maps: mapLinks
      }
    };

  } catch (error) {
    console.error("Chat error:", error);
    throw error;
  }
};

// --- TTS (Audio Generation) ---
export const generateSpeech = async (text: string): Promise<AudioBuffer> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned");

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    // Decode base64 to binary string
    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Create AudioBuffer manually as per Gemini documentation recommendations for raw PCM
    const dataInt16 = new Int16Array(bytes.buffer);
    const numChannels = 1;
    const frameCount = dataInt16.length / numChannels;
    const audioBuffer = audioContext.createBuffer(numChannels, frameCount, 24000);
    
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }

    return audioBuffer;

  } catch (error) {
    console.error("TTS error:", error);
    throw error;
  }
};