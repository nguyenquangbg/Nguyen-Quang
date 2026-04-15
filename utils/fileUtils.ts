
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const maxDimension = 1536; // Safe limit for Gemini Image API to avoid 500 Internal Error
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
            // Fallback if canvas context fails
            const result = reader.result as string;
            resolve(result.split(',')[1]);
            return;
        }

        // Draw and compress slightly to ensure manageable payload
        ctx.drawImage(img, 0, 0, width, height);
        
        // Use JPEG with slightly lower quality for faster upload/processing
        // 0.85 is still high quality but much smaller than 0.95
        const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(outputType, 0.85);
        
        resolve(dataUrl.split(',')[1]);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const cropImageToBase64 = (base64: string, mimeType: string, targetRatio: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = `data:${mimeType};base64,${base64}`;
        img.onload = () => {
            const currentRatio = img.width / img.height;
            let sourceX = 0;
            let sourceY = 0;
            let sourceWidth = img.width;
            let sourceHeight = img.height;

            if (currentRatio > targetRatio) {
                // Image is wider than target - crop sides
                sourceWidth = img.height * targetRatio;
                sourceX = (img.width - sourceWidth) / 2;
            } else {
                // Image is taller than target - crop top/bottom
                sourceHeight = img.width / targetRatio;
                sourceY = (img.height - sourceHeight) / 2;
            }

            const canvas = document.createElement('canvas');
            // Maintain a reasonable resolution for the crop
            const targetWidth = Math.min(sourceWidth, 1536);
            const targetHeight = targetWidth / targetRatio;
            
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(base64);
                return;
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);
            
            const dataUrl = canvas.toDataURL(mimeType, 0.95);
            resolve(dataUrl.split(',')[1]);
        };
        img.onerror = reject;
    });
};

export const resizeBase64Image = (base64: string, mimeType: string, maxDimension: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = `data:${mimeType};base64,${base64}`;
        img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width <= maxDimension && height <= maxDimension) {
                resolve(base64);
                return;
            }

            if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
            } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(base64);
                return;
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            
            const dataUrl = canvas.toDataURL(mimeType, 0.85);
            resolve(dataUrl.split(',')[1]);
        };
        img.onerror = reject;
    });
};

export const smartCropImageToBase64 = (
    base64: string, 
    mimeType: string, 
    targetRatio: number, 
    faceBox: [number, number, number, number] // [ymin, xmin, ymax, xmax] 0-1000
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = `data:${mimeType};base64,${base64}`;
        img.onload = () => {
            // Convert normalized coordinates to pixel coordinates
            const ymin = (faceBox[0] / 1000) * img.height;
            const xmin = (faceBox[1] / 1000) * img.width;
            const ymax = (faceBox[2] / 1000) * img.height;
            const xmax = (faceBox[3] / 1000) * img.width;

            const faceWidth = xmax - xmin;
            const faceHeight = ymax - ymin;
            const faceCenterX = xmin + faceWidth / 2;
            const faceCenterY = ymin + faceHeight / 2;

            // Heuristic for ID photo: 
            // 1. Face should be centered horizontally.
            // 2. Face should be roughly at 35-40% from the top of the frame.
            // 3. Frame should be wide enough to include shoulders.
            
            // To ensure face is centered, the crop width cannot exceed 2 * distance to nearest edge
            const maxCenteredWidth = 2 * Math.min(faceCenterX, img.width - faceCenterX);
            
            // Typically, face height is about 45-50% of the ID photo height for a good shoulder view
            let cropHeight = faceHeight / 0.48; 
            let cropWidth = cropHeight * targetRatio;

            // Ensure the crop includes the full face width with some padding
            const minCropWidth = faceWidth * 2.2;
            if (cropWidth < minCropWidth) {
                cropWidth = minCropWidth;
                cropHeight = cropWidth / targetRatio;
            }

            // If the calculated cropWidth is too large to keep the face centered, scale it down
            if (cropWidth > maxCenteredWidth) {
                cropWidth = maxCenteredWidth;
                cropHeight = cropWidth / targetRatio;
            }

            // Also ensure it doesn't exceed image height
            if (cropHeight > img.height) {
                cropHeight = img.height;
                cropWidth = cropHeight * targetRatio;
                // Re-check centering with new width
                if (cropWidth > maxCenteredWidth) {
                    cropWidth = maxCenteredWidth;
                    cropHeight = cropWidth / targetRatio;
                }
            }

            // Center horizontally on face
            let sourceX = faceCenterX - cropWidth / 2;
            // Position face at ~40% from top
            let sourceY = faceCenterY - cropHeight * 0.4;

            // Vertical bounds check (horizontal is already handled by maxCenteredWidth)
            if (sourceY < 0) sourceY = 0;
            if (sourceY + cropHeight > img.height) sourceY = img.height - cropHeight;
            
            // Final horizontal safety check (should be fine due to maxCenteredWidth)
            if (sourceX < 0) sourceX = 0;
            if (sourceX + cropWidth > img.width) sourceX = img.width - cropWidth;

            const canvas = document.createElement('canvas');
            const targetWidth = Math.min(cropWidth, 1536);
            const targetHeight = targetWidth / targetRatio;
            
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(base64);
                return;
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, sourceX, sourceY, cropWidth, cropHeight, 0, 0, targetWidth, targetHeight);
            
            const dataUrl = canvas.toDataURL(mimeType, 0.95);
            resolve(dataUrl.split(',')[1]);
        };
        img.onerror = reject;
    });
};
