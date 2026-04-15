import { GoogleGenAI, Modality, HarmCategory, HarmBlockThreshold, Type, ThinkingLevel } from "@google/genai";
import { ImageFile, IdAnalysisResult } from '../types';
import { resizeBase64Image } from '../utils/fileUtils';

const getApiKey = () => {
  if (typeof window !== 'undefined') {
    const customKey = localStorage.getItem('custom_gemini_api_key');
    if (customKey && customKey.trim().length > 10) return customKey.trim();
  }
  
  // Try various ways to get the key (platform specific)
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
      if (process.env.API_KEY) return process.env.API_KEY;
    }
  } catch (e) {}

  // Vite fallback
  const viteKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (viteKey) return viteKey;

  return '';
};

export const editImageWithPrompt = async (
  image: ImageFile,
  prompt: string,
  modelName: string = 'flash',
  backgroundImage?: ImageFile | null
): Promise<string> => {
  const apiKey = getApiKey();
  const isGitHub = typeof window !== 'undefined' && window.location.hostname.includes('github.io');

  if (!apiKey) {
      if (isGitHub) {
          throw new Error("Bạn đang chạy ứng dụng trên GitHub. Vì lý do bảo mật, API Key không được tự động chuyển sang GitHub. Vui lòng nhấn nút 'Cài đặt Key cá nhân' ở cuối trang để nhập Key Gemini của bạn.");
      }
      throw new Error("Không tìm thấy API Key. Vui lòng kiểm tra cấu hình.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Use gemini-2.5-flash-image as default for editing (Fastest & Free-tier friendly)
  let effectiveModel = 'gemini-2.5-flash-image';
  
  // If user has a custom key, they might want higher quality models, but still prioritize speed
  const isCustomKey = typeof window !== 'undefined' && !!localStorage.getItem('custom_gemini_api_key');
  
  if (modelName === 'pro') {
      // Use 3.1 flash as the "high quality but fast" option
      effectiveModel = 'gemini-3.1-flash-image-preview';
  } else if (modelName === 'flash') {
      effectiveModel = 'gemini-2.5-flash-image';
  } else if (modelName !== 'flash' && modelName.includes('gemini')) {
      effectiveModel = modelName;
  }

  console.log(`AI Edit: Starting with model ${effectiveModel} (Speed Optimized)`);
  
  let retries = 2;
  const currentPrompt = prompt;
  const attemptedModels = new Set<string>();
  
  while (retries >= 0) {
      try {
        attemptedModels.add(effectiveModel);
        
        // Increase resolution to 2048px for high-quality output suitable for printing
        const maxDim = effectiveModel.includes('3.1') ? 3072 : 2048;
        const optimizedImageBase64 = await resizeBase64Image(image.base64, image.mimeType, maxDim);
        
        const parts: any[] = [
            {
                inlineData: {
                  data: optimizedImageBase64,
                  mimeType: image.mimeType,
                },
            }
        ];

        if (backgroundImage) {
            const optimizedBgBase64 = await resizeBase64Image(backgroundImage.base64, backgroundImage.mimeType, maxDim);
            parts.push({
                inlineData: {
                    data: optimizedBgBase64,
                    mimeType: backgroundImage.mimeType,
                }
            });
        }

        parts.push({ text: currentPrompt });

        // Add a timeout to prevent hanging forever
        const responsePromise = ai.models.generateContent({
          model: effectiveModel,
          contents: { parts: parts },
          config: {
            responseModalities: [Modality.IMAGE],
            thinkingConfig: effectiveModel.includes('gemini-3') ? { thinkingLevel: ThinkingLevel.LOW } : undefined,
            safetySettings: [
              { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
              { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
              { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
              { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
            ],
          },
        });

        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Yêu cầu quá thời gian (Timeout). Vui lòng thử lại hoặc kiểm tra kết nối mạng.")), 60000)
        );

        const response = await Promise.race([responsePromise, timeoutPromise]) as any;

        if (response.promptFeedback?.blockReason) {
          throw new Error(`Yêu cầu bị chặn do chính sách an toàn: ${response.promptFeedback.blockReason}. Hãy thử thay đổi ảnh hoặc yêu cầu.`);
        }

        const candidate = response.candidates?.[0];
        if (!candidate) throw new Error("AI không trả về kết quả. Vui lòng thử lại.");
        
        if (candidate.finishReason && !['STOP', 'MAX_TOKENS'].includes(candidate.finishReason)) {
            const reason = candidate.finishReason === 'SAFETY' ? "chính sách an toàn" : candidate.finishReason;
            throw new Error(`AI dừng xử lý do: ${reason}.`);
        }
        
        if (!candidate.content?.parts) {
          throw new Error("Phản hồi từ AI trống.");
        }

        for (const part of candidate.content.parts) {
          if (part.inlineData?.data) {
            return part.inlineData.data;
          }
        }
        
        throw new Error("AI không tạo ra hình ảnh trong kết quả. Hãy thử nhấn 'Tạo ảnh' lại.");

      } catch (error: any) {
        const errorString = String(error);
        const isQuotaError = errorString.includes('429') || errorString.includes('RESOURCE_EXHAUSTED');
        const isPermissionError = errorString.includes('403') || errorString.includes('PERMISSION_DENIED');
        const isNotFoundError = errorString.includes('404') || errorString.includes('NOT_FOUND');
        const isInternalError = errorString.includes('500') || errorString.includes('Internal');

        console.error(`Gemini Edit Error (Retries: ${retries}, Model: ${effectiveModel}):`, error);

        // Advanced Fallback logic for 403/429/404 - Prioritizing Flash models
        if (isQuotaError || isPermissionError || isNotFoundError) {
            if (effectiveModel === 'gemini-3.1-flash-image-preview') {
                effectiveModel = 'gemini-2.5-flash-image';
            } else if (effectiveModel === 'gemini-2.5-flash-image') {
                // Try 3.1 flash if we haven't yet, otherwise we're out of options
                if (!attemptedModels.has('gemini-3.1-flash-image-preview')) {
                    effectiveModel = 'gemini-3.1-flash-image-preview';
                } else {
                    retries = 0;
                }
            } else {
                effectiveModel = 'gemini-2.5-flash-image';
            }
            
            if (retries === 0 && effectiveModel !== 'gemini-2.5-flash-image') retries = 1; 
            continue;
        }

        if (retries > 0 && (isInternalError || errorString.includes('fetch'))) {
            await new Promise(r => setTimeout(r, 1500));
            retries--;
            continue;
        }

        let userMsg = "Lỗi khi tạo ảnh.";
        if (isQuotaError) {
            userMsg = "Hết lượt sử dụng (Quota exceeded). Vui lòng nhấn nút 'Cài đặt Key cá nhân' bên dưới để nhập Key của riêng bạn và tiếp tục sử dụng miễn phí không giới hạn.";
        } else if (isPermissionError) {
            userMsg = "Lỗi quyền truy cập (403): API Key của bạn không có quyền sử dụng tính năng này. Hãy đảm bảo bạn đã bật 'Generative Language API' trong Google AI Studio và Key không bị giới hạn vùng địa lý.";
        } else if (isInternalError) {
            userMsg = "Lỗi máy chủ AI (500). Vui lòng thử lại sau giây lát.";
        } else if (error.message) {
            userMsg = error.message;
        }

        throw new Error(userMsg);
      }
  }
  throw new Error("Không nhận được phản hồi từ AI.");
};

export const refinePrompt = async (text: string, mode: 'id' | 'restore'): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const model = 'gemini-3.1-flash-lite-preview'; 
    
    const systemInstruction = mode === 'id' 
        ? "You are an expert prompt engineer for professional studio photography. Convert the user's simple request into a highly detailed, technical prompt for an AI image editor. \n" +
          "CRITICAL RULE 1: If the user asks to 'make hair neater', 'tidy hair', 'gọn tóc', or similar, DO NOT change the hairstyle. Instead, use technical terms like 'clean up flyaways', 'tidy hair edges', 'remove stray hairs', and 'maintain original hairstyle and volume strictly'. \n" +
          "CRITICAL RULE 2: Always include instructions to ensure the subject is sitting perfectly straight, shoulders are level, and the head faces directly forward (en face). Use terms like 'posture correction', 'level shoulders', and 'perfect en-face alignment'. \n" +
          "CRITICAL RULE 3: Always include instructions to sharpen and define the ears (vành tai). Use terms like 'ear clarity', 'sharp ear definition', and 'well-defined ear contours'. \n" +
          "CRITICAL RULE 4: Always specify Ultra High Definition (UHD), 8K resolution, and extreme sharpness. Focus on fine details like skin pores, individual hair strands, and fabric weave to ensure the image is suitable for large-scale printing. \n" +
          "Focus on lighting, texture, camera settings, and realistic skin rendering. expand the request with professional photography terminology."
        : "You are an expert in archival photo restoration and digital forensics. Convert the user's restoration request into a technical prompt for high-end AI restoration. \n" +
          "CRITICAL RULE: If the user asks to 'make hair neater' or 'gọn tóc', DO NOT replace the hair. Use terms like 'digital hair grooming', 'edge refinement', and 'stray hair removal' while preserving the original hair structure and identity. \n" +
          "Focus on grain reduction, color accuracy, and museum-grade archival quality.";

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: { 
                parts: [
                    { text: systemInstruction },
                    { text: `User Request: "${text}"\n\nRefined Technical Prompt:` }
                ]
            },
            config: {
                temperature: 0.7,
                topP: 0.95,
                maxOutputTokens: 300,
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
            }
        });
        return response.text?.trim() || text;
    } catch (e) { 
        console.error("Prompt refinement failed", e);
        return text; 
    }
};

export const analyzeImageAttributes = async (image: ImageFile): Promise<IdAnalysisResult> => {
    const apiKey = getApiKey();
    const isGitHub = typeof window !== 'undefined' && window.location.hostname.includes('github.io');

    if (!apiKey && isGitHub) {
        return {
            gender: "Không xác định", ageRange: "--",
            skinCondition: "Thiếu API Key",
            clothingStyle: "Thiếu API Key",
            hairStyle: "Thiếu API Key",
            background: { isClean: true, color: "Unknown", description: "Vui lòng cài đặt API Key cá nhân" },
            lighting: { isEven: true, description: "---" },
            face: { isStraight: true, isClear: true, isSymmetric: true, description: "Bạn đang chạy trên GitHub. Vui lòng nhập API Key cá nhân ở cuối trang." },
            quality: { isSharp: true, hasNoise: false, description: "---" },
            overallPass: true,
            recommendations: "Nhấn 'Cài đặt Key cá nhân' để nhập mã API của bạn."
        };
    }

    const ai = new GoogleGenAI({ apiKey });
    
    let effectiveModel = 'gemini-3.1-flash-lite-preview';
    let retries = 1;

    while (retries >= 0) {
        try {
            // Optimize: Resize image to 384px for even faster analysis and lower quota usage
            const optimizedBase64 = await resizeBase64Image(image.base64, image.mimeType, 384);

            const responsePromise = ai.models.generateContent({
                model: effectiveModel,
                contents: {
                    parts: [
                        { inlineData: { data: optimizedBase64, mimeType: image.mimeType } },
                        { text: "Phân tích ảnh chân dung này. Trả về JSON: giới tính (Nam/Nữ/Trẻ em/Không xác định), độ tuổi, da, trang phục, tóc, nền (isClean, color, desc), ánh sáng (isEven, desc), mặt (isStraight, isClear, isSymmetric, desc, boundingBox [ymin, xmin, ymax, xmax] 0-1000), chất lượng (isSharp, hasNoise, desc), overallPass (boolean), recommendations (string). TẤT CẢ MÔ TẢ TIẾNG VIỆT." }
                    ]
                },
                config: {
                    responseMimeType: "application/json",
                    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            gender: { type: Type.STRING, enum: ["Nam", "Nữ", "Trẻ em (Nam)", "Trẻ em (Nữ)", "Không xác định"] },
                            ageRange: { type: Type.STRING, description: "Độ tuổi ước tính (ví dụ: 25-30 tuổi)." },
                            skinCondition: { type: Type.STRING, description: "Mô tả chi tiết về da: mụn, nếp nhăn, kết cấu, tông màu (bằng tiếng Việt)." },
                            clothingStyle: { type: Type.STRING, description: "Kiểu dáng và màu sắc trang phục hiện tại (bằng tiếng Việt)." },
                            hairStyle: { type: Type.STRING, description: "Kiểu tóc, độ dài và màu sắc hiện tại (bằng tiếng Việt)." },
                            background: {
                                type: Type.OBJECT,
                                properties: {
                                    isClean: { type: Type.BOOLEAN },
                                    color: { type: Type.STRING, description: "Màu sắc phông nền." },
                                    description: { type: Type.STRING, description: "Mô tả chi tiết về phông nền (bằng tiếng Việt)." }
                                },
                                required: ["isClean", "color", "description"]
                            },
                            lighting: {
                                type: Type.OBJECT,
                                properties: {
                                    isEven: { type: Type.BOOLEAN },
                                    description: { type: Type.STRING, description: "Mô tả về điều kiện ánh sáng (bằng tiếng Việt)." }
                                },
                                required: ["isEven", "description"]
                            },
                            face: {
                                type: Type.OBJECT,
                                properties: {
                                    isStraight: { type: Type.BOOLEAN },
                                    isClear: { type: Type.BOOLEAN },
                                    isSymmetric: { type: Type.BOOLEAN, description: "Kiểm tra xem hai bên vai và khuôn mặt có cân đối trong khung hình không." },
                                    description: { type: Type.STRING, description: "Mô tả về khuôn mặt và sự cân đối (bằng tiếng Việt)." },
                                    boundingBox: { 
                                        type: Type.ARRAY, 
                                        items: { type: Type.NUMBER },
                                        description: "Tọa độ hộp giới hạn khuôn mặt [ymin, xmin, ymax, xmax] (0-1000)."
                                    }
                                },
                                required: ["isStraight", "isClear", "isSymmetric", "description"]
                            },
                            quality: {
                                type: Type.OBJECT,
                                properties: {
                                    isSharp: { type: Type.BOOLEAN },
                                    hasNoise: { type: Type.BOOLEAN },
                                    description: { type: Type.STRING, description: "Mô tả về chất lượng ảnh (bằng tiếng Việt)." }
                                },
                                required: ["isSharp", "hasNoise", "description"]
                            },
                            overallPass: { type: Type.BOOLEAN },
                            recommendations: { type: Type.STRING, description: "Các gợi ý từ AI để có kết quả chỉnh sửa tốt nhất (bằng tiếng Việt)." }
                        },
                        required: ["gender", "ageRange", "skinCondition", "clothingStyle", "hairStyle", "background", "lighting", "face", "quality", "overallPass", "recommendations"]
                    }
                }
            });

            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Phân tích quá thời gian.")), 30000)
            );

            const response = await Promise.race([responsePromise, timeoutPromise]) as any;

            const text = response.text;
            if (!text) throw new Error("No response text");
            
            return JSON.parse(text) as IdAnalysisResult;
        } catch (e: any) {
            console.error(`Analysis attempt failed (Model: ${effectiveModel}, Retries: ${retries})`, e);
            const errorString = String(e);
            const isQuotaError = errorString.includes('429') || errorString.includes('RESOURCE_EXHAUSTED');
            const isPermissionError = errorString.includes('403') || errorString.includes('PERMISSION_DENIED');

            if ((isQuotaError || isPermissionError) && effectiveModel === 'gemini-3-flash-preview') {
                effectiveModel = 'gemini-1.5-flash';
                retries++;
                continue;
            }

            if (retries > 0) {
                retries--;
                continue;
            }

            return {
                gender: "Không xác định", ageRange: "--",
                skinCondition: "Không thể phân tích",
                clothingStyle: "Không thể phân tích",
                hairStyle: "Không thể phân tích",
                background: { isClean: true, color: "Unknown", description: "Không thể phân tích" },
                lighting: { isEven: true, description: "---" },
                face: { isStraight: true, isClear: true, isSymmetric: true, description: isQuotaError ? "Vượt quá giới hạn lượt sử dụng (Quota exceeded)" : "---" },
                quality: { isSharp: true, hasNoise: false, description: "---" },
                overallPass: true,
                recommendations: isQuotaError ? "Vượt quá giới hạn lượt sử dụng. Hãy dùng 'Key cá nhân' ở cuối trang để tiếp tục." : "Vui lòng thử lại"
            };
        }
    }
    throw new Error("Analysis failed after all attempts.");
};
