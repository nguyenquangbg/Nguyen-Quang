
import React from 'react';

interface TextResultDisplayProps {
  title: string;
  text: string | null;
  sources?: any[] | null;
  placeholder: string;
  themeClasses: any;
}

const TextResultDisplay: React.FC<TextResultDisplayProps> = ({ title, text, sources, placeholder, themeClasses }) => {
  return (
    <div className={`${themeClasses.bgSecondary} rounded-lg shadow-lg p-4 w-full flex flex-col min-h-[300px]`}>
      <h2 className={`text-lg font-semibold ${themeClasses.accentText} mb-4 text-center`}>{title}</h2>
      <div className={`${themeClasses.bgPrimary}/50 rounded-md flex-grow p-4 text-left overflow-auto`}>
        {text ? (
          <>
            <pre className={`${themeClasses.textPrimary} whitespace-pre-wrap font-sans`}>{text}</pre>
            {sources && sources.length > 0 && (
                <div className={`mt-4 pt-4 border-t ${themeClasses.border}`}>
                    <h3 className={`text-md font-semibold ${themeClasses.textSecondary} mb-2`}>Nguồn:</h3>
                    <ul className="list-disc list-inside space-y-1">
                        {sources.map((source, index) => (
                           source.web?.uri && (
                             <li key={index}>
                                <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className={`${themeClasses.accentTextStrong} ${themeClasses.accentTextHover}`}>
                                    {source.web.title || source.web.uri}
                                </a>
                            </li>
                           )
                        ))}
                    </ul>
                </div>
            )}
          </>
        ) : (
          <div className={`${themeClasses.textSecondary} text-center h-full flex items-center justify-center`}>
             <div className="text-center px-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-2">{placeholder}</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TextResultDisplay;
