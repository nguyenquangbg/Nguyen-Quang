
import React from 'react';
import Spinner from './Spinner';

interface ImageDisplayProps {
  title: string;
  imageSrc: string | null;
  isLoading?: boolean;
  placeholderText: string;
  themeClasses: any;
  downloadable?: boolean;
  downloadFilename?: string;
  onDownload?: () => void;
  // minHeight prop is deprecated in favor of fixed height class logic
}

const DownloadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);


const ImageDisplay: React.FC<ImageDisplayProps> = ({
  title,
  imageSrc,
  isLoading = false,
  placeholderText,
  themeClasses,
  downloadable = false,
  downloadFilename = 'image.png',
  onDownload,
}) => {
  const handleDownload = (e: React.MouseEvent) => {
    if (onDownload) {
        e.preventDefault();
        onDownload();
    }
  };

  return (
    <div className={`${themeClasses.bgSecondary} rounded-xl shadow-lg p-4 w-full flex flex-col border ${themeClasses.border}`}>
      <h2 className={`text-lg font-bold ${themeClasses.accentText} mb-3 text-center tracking-wide`}>{title}</h2>
      
      {/* Increased height from 450px to 550px for larger viewing area */}
      <div className={`w-full h-[550px] ${themeClasses.bgPrimary}/40 rounded-lg flex items-center justify-center overflow-hidden relative border ${themeClasses.borderSecondary} border-dashed`}>
        {isLoading ? (
          <div className={themeClasses.accentTextStrong}><Spinner /></div>
        ) : imageSrc ? (
          <img
            src={imageSrc}
            alt={title}
            className="object-contain w-full h-full"
          />
        ) : (
          <div className={`${themeClasses.textSecondary} text-center px-4 py-10`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="mt-4 text-sm font-medium">{placeholderText}</p>
          </div>
        )}
      </div>
       {imageSrc && downloadable && (
        <a
          href={imageSrc}
          download={downloadFilename}
          onClick={handleDownload}
          className={`mt-4 w-full text-center ${themeClasses.button.bg} ${themeClasses.button.hoverBg} ${themeClasses.button.text} font-bold py-3 px-4 rounded-lg inline-flex items-center justify-center transition-all shadow-md`}
        >
          <DownloadIcon />
          <span>Tải xuống</span>
        </a>
      )}
    </div>
  );
};

export default ImageDisplay;
