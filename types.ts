
export interface ImageFile {
  base64: string;
  mimeType: string;
  name: string;
}

export interface IdAnalysisResult {
  gender: string;
  ageRange: string;
  skinCondition: string;
  clothingStyle: string;
  hairStyle: string;
  background: {
    isClean: boolean;
    color: string;
    description: string;
  };
  lighting: {
    isEven: boolean;
    description: string;
  };
  face: {
    isStraight: boolean;
    isClear: boolean;
    isSymmetric: boolean;
    description: string;
    boundingBox?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized 0-1000
  };
  quality: {
    isSharp: boolean;
    hasNoise: boolean;
    description: string;
  };
  overallPass: boolean;
  recommendations: string;
}
