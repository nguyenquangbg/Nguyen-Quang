import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { ImageFile, IdAnalysisResult } from './types';
import { fileToBase64, cropImageToBase64, smartCropImageToBase64, resizeBase64Image } from './utils/fileUtils';
import { editImageWithPrompt, analyzeImageAttributes, refinePrompt } from './services/geminiService';
import ImageDisplay from './components/ImageDisplay';
import Spinner from './components/Spinner';

// --- ICONS ---
const UploadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const MagicWandIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
);

const ChipIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
    </svg>
);

const SparklesIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 9a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zm7-10a1 1 0 01.707.293l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L12.586 5H10a1 1 0 110-2h2.586l-1.293-1.293A1 1 0 0112 1z" clipRule="evenodd" />
  </svg>
);

const SaveIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" />
    </svg>
);

const TrashIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
);

const UndoIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
    </svg>
);

const RedoIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);

const ChevronLeftIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
);

const ChevronRightIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
);

const AnalyzeIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 7v3m0 0v3m0-3h3m-3 0H7" />
  </svg>
);

const BrainIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
      <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
    </svg>
);

const FacebookIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-blue-500">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
);

const PhoneIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
    </svg>
);


// --- THEME DEFINITIONS ---
const themes = {
  dark: {
    name: 'Tối',
    preview: { bg: 'bg-slate-900', text: 'bg-slate-100', accent: 'bg-sky-400' },
    bgPrimary: 'bg-slate-900',
    textPrimary: 'text-slate-100',
    textSecondary: 'text-slate-400',
    bgSecondary: 'bg-slate-800/50',
    bgTertiary: 'bg-slate-700',
    bgInput: 'bg-slate-700',
    border: 'border-slate-700',
    borderSecondary: 'border-slate-600',
    accentText: 'text-sky-300',
    accentTextStrong: 'text-sky-400',
    accentTextHover: 'hover:underline',
    accentRing: 'focus:ring-sky-500',
    accentBorderHover: 'hover:border-sky-500',
    gradientFrom: 'from-sky-400',
    gradientTo: 'to-blue-500',
    button: {
      bg: 'bg-gradient-to-r from-sky-500 to-blue-600',
      hoverBg: 'hover:from-sky-600 hover:to-blue-700',
      text: 'text-white'
    },
    navButton: {
      activeBg: 'bg-sky-500',
      activeText: 'text-white',
      inactiveBg: 'bg-transparent',
      inactiveText: 'text-slate-400',
      hoverBg: 'hover:bg-slate-700/50',
    },
    optionButton: {
      activeBg: 'bg-sky-500',
      activeHoverBg: 'hover:bg-sky-400',
      activeBorder: 'border-sky-500',
      activeText: 'text-white',
      inactiveBg: 'bg-slate-700',
      inactiveBorder: 'border-slate-600',
      hoverBg: 'hover:bg-slate-600',
      hoverBorder: 'hover:border-sky-500',
    }
  },
  light: {
    name: 'Sáng',
    preview: { bg: 'bg-gray-100', text: 'bg-gray-900', accent: 'bg-blue-500' },
    bgPrimary: 'bg-gray-100',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-500',
    bgSecondary: 'bg-white',
    bgTertiary: 'bg-gray-200',
    bgInput: 'bg-gray-200',
    border: 'border-gray-200',
    borderSecondary: 'border-gray-300',
    accentText: 'text-blue-600',
    accentTextStrong: 'text-blue-500',
    accentTextHover: 'hover:underline',
    accentRing: 'focus:ring-blue-500',
    accentBorderHover: 'hover:border-blue-500',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-indigo-600',
    button: {
      bg: 'bg-gradient-to-r from-blue-500 to-indigo-600',
      hoverBg: 'hover:from-blue-600 hover:to-indigo-700',
      text: 'text-white'
    },
     navButton: {
      activeBg: 'bg-blue-600',
      activeText: 'text-white',
      inactiveBg: 'bg-transparent',
      inactiveText: 'text-gray-600',
      hoverBg: 'hover:bg-gray-200',
    },
    optionButton: {
      activeBg: 'bg-blue-600',
      activeHoverBg: 'hover:bg-blue-500',
      activeBorder: 'border-blue-600',
      activeText: 'text-white',
      inactiveBg: 'bg-white',
      inactiveBorder: 'border-gray-300',
      hoverBg: 'hover:bg-blue-100',
      hoverBorder: 'hover:border-blue-500',
    }
  },
  blue: {
    name: 'Xanh Lam',
    preview: { bg: 'bg-blue-950', text: 'bg-blue-100', accent: 'bg-cyan-400' },
    bgPrimary: 'bg-blue-950',
    textPrimary: 'text-blue-100',
    textSecondary: 'text-blue-300',
    bgSecondary: 'bg-blue-900/70',
    bgTertiary: 'bg-sky-900',
    bgInput: 'bg-sky-900/50',
    border: 'border-blue-800',
    borderSecondary: 'border-blue-700',
    accentText: 'text-cyan-300',
    accentTextStrong: 'text-cyan-400',
    accentTextHover: 'hover:underline',
    accentRing: 'focus:ring-cyan-400',
    accentBorderHover: 'hover:border-cyan-400',
    gradientFrom: 'from-cyan-400',
    gradientTo: 'to-teal-400',
    button: {
      bg: 'bg-gradient-to-r from-cyan-500 to-teal-500',
      hoverBg: 'hover:from-cyan-600 hover:to-teal-600',
      text: 'text-white'
    },
     navButton: {
      activeBg: 'bg-cyan-500',
      activeText: 'text-white',
      inactiveBg: 'bg-transparent',
      inactiveText: 'text-blue-200',
      hoverBg: 'hover:bg-blue-800/60',
    },
    optionButton: {
      activeBg: 'bg-cyan-500',
      activeHoverBg: 'hover:bg-cyan-400',
      activeBorder: 'border-cyan-500',
      activeText: 'text-white',
      inactiveBg: 'bg-blue-800/50',
      inactiveBorder: 'border-blue-700',
      hoverBg: 'hover:bg-blue-800',
      hoverBorder: 'hover:border-cyan-400',
    }
  }
};

type ThemeName = keyof typeof themes;
type ModelType = 'flash' | 'pro';
type ThemeType = typeof themes.dark;
type AdvancedTab = 'adjustments' | 'ai2025';

// --- MAIN TYPES ---

type Mode = 'id' | 'restore';
type ClothingOption = 
    | 'vest_nam' | 'vest_nam_xam' | 'vest_nam_den_no' | 'vest_nam_congso'
    | 'somi_nam_trang' | 'somi_nam_xanh' | 'somi_nam_den' | 'somi_nam_hong'
    | 'ao_thun_co_co' | 'polo_nam_do' | 'ao_thun_den'
    | 'aodai_nam_truyenthong'
    | 'vest_nu' | 'vest_nu_be' | 'vest_nu_den'
    | 'somi_nu_trang' | 'somi_nu_xanh' | 'somi_nu_no'
    | 'ao_dai_trang' | 'aodai_do' | 'aodai_xanh'
    | 'graduation_gown'
    | 'yem_hong' | 'ao_kieu_xanh_ngoc' | 'aodai_cachtan' | 'aodai_cachtan_gam' | 'aodai_cachtan_pastel' | 'aodai_cachtan_gem'
    // Children Options
    | 'kid_boy_student' | 'kid_boy_vest' | 'kid_boy_shirt_bow' | 'kid_boy_polo' | 'kid_boy_shirt_white' | 'kid_boy_shirt_color' | 'kid_boy_aodai_cachtan'
    | 'kid_girl_student' | 'kid_girl_dress' | 'kid_girl_aodai' | 'kid_girl_shirt_white' | 'kid_girl_shirt_color' | 'kid_girl_aodai_cachtan';

type HairOption = 
    | 'keep_original' | 'short_neat' | 'side_part' | 'light_curl' | 'two_block' | 'eboy' | 'buzz_cut'
    | 'long_wavy' | 'long_straight' | 'short_bob' | 'pixie' | 'layer_curl' | 'french_bob' | 'wolf_cut';

type AspectRatioID = '3x4' | '4x6' | '1:1' | 'original' | 'free';
type RestoreEffect = 'film' | 'sepia' | 'bw';
type ProVintageEffect = 'none' | 'light_leaks' | 'organic_grain' | 'kodak_portra' | 'fuji_pro';
type AdjustmentLevel = 'none' | 'low' | 'medium';
type DenoiseLevel = 'none' | 'low' | 'medium' | 'high';
type Intensity = 'low' | 'medium' | 'high';
type UpscaleLevel = 'none' | '2x' | '4x' | '8x';
type ColorTemp = 'normal' | 'warm' | 'cool';
type WhiteBalance = 'neutral' | 'auto_correct';
type SkinSmoothingLevel = 'none' | 'subtle' | 'medium' | 'strong';
type FaceEnhancementLevel = 'default' | 'advanced' | 'professional';
type ColorizeStyle = 'natural' | 'vibrant' | 'pastel' | 'cinematic';
type ColorIntensity = 'subtle' | 'balanced' | 'intense';
type RestorationWorkflow = 'standard' | 'pro_studio';
type SkinTextureLevel = 'low' | 'medium' | 'high';
type PoreVisibilityLevel = 'smooth' | 'natural' | 'visible';
type SkinTone = 'default' | 'fair' | 'rosy' | 'golden' | 'tan';
type Gender = 'male' | 'female';
// Changed from boolean to Multi-level
type MicroDetailLevel = 'off' | 'low' | 'medium' | 'high';

// NEW BACKGROUND TYPES
type BackgroundType = 'solid' | 'gradient' | 'pattern' | 'custom';

interface HistoryItem {
  rawOriginal?: ImageFile | null;
  original: ImageFile | null; // null only if we supported mode without original, but now ID/Restore always have original
  edited: string; // Full data URI
  prompt?: string;
}

interface Preset {
    id: string;
    name: string;
    mode: Mode;
    data: any; // Stores idOptions or restoreOptions + prompts
}

// --- HELPER COMPONENTS ---

const FeatureBanner: React.FC<{ title: string; features: string[]; themeClasses: ThemeType }> = ({ title, features, themeClasses }) => (
    <div className={`${themeClasses.bgTertiary}/40 p-4 rounded-lg border ${themeClasses.borderSecondary} text-left mb-6`}>
        <h3 className={`text-lg font-bold ${themeClasses.accentText} mb-2`}>{title}</h3>
        <ul className={`space-y-1 ${themeClasses.textSecondary} text-sm`}>
            {features.map((feature, index) => (
                <li key={index} className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-green-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>{feature}</span>
                </li>
            ))}
        </ul>
    </div>
);

const ModeNavButton: React.FC<{ targetMode: Mode, currentMode: Mode, onClick: (m: Mode) => void, themeClasses: ThemeType, children: React.ReactNode }> = ({ targetMode, currentMode, onClick, themeClasses, children }) => (
    <button
        type="button"
        onClick={() => onClick(targetMode)}
        className={`flex-1 px-2 py-3 text-sm sm:text-base font-bold transition-colors duration-300 ${currentMode === targetMode ? `${themeClasses.navButton.activeBg} ${themeClasses.navButton.activeText}` : `${themeClasses.navButton.inactiveBg} ${themeClasses.navButton.inactiveText} ${themeClasses.navButton.hoverBg}`}`}
        aria-pressed={currentMode === targetMode}
    >
        {children}
    </button>
);

const OptionButton: React.FC<{ active: boolean, onClick: () => void, children: React.ReactNode, themeClasses: ThemeType }> = ({ active, onClick, children, themeClasses }) => (
    <button
        type="button"
        onClick={onClick}
        className={`w-full text-center text-sm py-1.5 px-2 rounded-md transition-all duration-200 border ${active ? `${themeClasses.optionButton.activeBg} ${themeClasses.optionButton.activeBorder} ${themeClasses.optionButton.activeText} ${themeClasses.optionButton.activeHoverBg} font-semibold shadow-sm` : `${themeClasses.optionButton.inactiveBg} ${themeClasses.optionButton.inactiveBorder} ${themeClasses.optionButton.hoverBorder} ${themeClasses.optionButton.hoverBg} hover:shadow`}`}
    >
        {children}
    </button>
);

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; label: string; themeClasses: ThemeType }> = ({ checked, onChange, label, themeClasses }) => (
  <label className={`flex items-center justify-between cursor-pointer p-3 rounded-md transition-colors ${themeClasses.bgTertiary}/30 hover:${themeClasses.bgTertiary}/50`}>
      <span className={`font-medium ${themeClasses.textPrimary}`}>{label}</span>
      <div className="relative">
          <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
          <div className={`block w-14 h-8 rounded-full transition-colors ${checked ? `bg-gradient-to-r ${themeClasses.gradientFrom} ${themeClasses.gradientTo}` : themeClasses.bgTertiary}`}></div>
          <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${checked ? 'transform translate-x-6' : ''}`}></div>
      </div>
  </label>
);

const ModelSelector: React.FC<{ selectedModel: ModelType, onSelect: (m: ModelType) => void, themeClasses: ThemeType }> = ({ selectedModel, onSelect, themeClasses }) => (
    <div className={`mb-6 p-1 ${themeClasses.bgTertiary} rounded-lg flex relative`}>
        <button
            type="button"
            onClick={() => onSelect('flash')}
            className={`flex-1 flex items-center justify-center py-2 px-2 rounded-md text-sm font-medium transition-all duration-300 z-10 ${selectedModel === 'flash' ? `${themeClasses.bgSecondary} ${themeClasses.textPrimary} shadow-sm` : `${themeClasses.textSecondary} hover:${themeClasses.textPrimary}`}`}
        >
            <ChipIcon />
            Siêu Tốc (Flash 2.5)
        </button>
        <button
            type="button"
            onClick={() => onSelect('pro')}
            className={`flex-1 flex items-center justify-center py-2 px-2 rounded-md text-sm font-medium transition-all duration-300 z-10 ${selectedModel === 'pro' ? `${themeClasses.bgSecondary} text-transparent bg-clip-text bg-gradient-to-r ${themeClasses.gradientFrom} ${themeClasses.gradientTo} font-bold shadow-sm` : `${themeClasses.textSecondary} hover:${themeClasses.textPrimary}`}`}
        >
            <SparklesIcon />
            Chất Lượng (Flash 3.1)
        </button>
    </div>
);

const AnalysisResultCard: React.FC<{ result: IdAnalysisResult; themeClasses: ThemeType }> = ({ result, themeClasses }) => {
    // Safety check to prevent crash if result is malformed
    if (!result || !result.background || !result.lighting || !result.quality || !result.face) return null;

    return (
        <div className={`mt-2 p-4 rounded-xl border ${themeClasses.borderSecondary} ${themeClasses.bgSecondary} text-xs sm:text-sm shadow-lg backdrop-blur-sm`}>
            <div className="flex items-center mb-3">
                <div className={`p-1.5 rounded-lg ${themeClasses.bgTertiary} mr-2`}>
                    <BrainIcon />
                </div>
                <h4 className={`font-bold ${themeClasses.accentText} uppercase tracking-wider`}>Trí Tuệ Nhân Tạo Phân Tích:</h4>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <div className="flex justify-between border-b border-dashed border-gray-600 pb-1">
                        <span className={themeClasses.textSecondary}>Đối tượng:</span>
                        <span className="font-semibold">{result.gender} ({result.ageRange})</span>
                    </div>
                    <div className="flex flex-col">
                        <span className={themeClasses.textSecondary}>Tình trạng da:</span>
                        <span className="text-[11px] leading-tight mt-0.5">{result.skinCondition}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className={themeClasses.textSecondary}>Trang phục hiện tại:</span>
                        <span className="text-[11px] leading-tight mt-0.5">{result.clothingStyle}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className={themeClasses.textSecondary}>Kiểu tóc hiện tại:</span>
                        <span className="text-[11px] leading-tight mt-0.5">{result.hairStyle}</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className={themeClasses.textSecondary}>Phông nền:</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${result.background.isClean ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                            {result.background.isClean ? "TIÊU CHUẨN" : "CẦN XỬ LÝ"}
                        </span>
                    </div>
                    <p className="text-[10px] opacity-70 italic leading-tight">{result.background.description}</p>

                    <div className="flex justify-between items-center">
                        <span className={themeClasses.textSecondary}>Ánh sáng:</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${result.lighting.isEven ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                            {result.lighting.isEven ? "ĐỒNG ĐỀU" : "CẦN CÂN BẰNG"}
                        </span>
                    </div>
                    <p className="text-[10px] opacity-70 italic leading-tight">{result.lighting.description}</p>

                    <div className="flex justify-between items-center">
                        <span className={themeClasses.textSecondary}>Chất lượng:</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${result.quality.isSharp ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                            {result.quality.isSharp ? "SẮC NÉT" : "THẤP/NHIỄU"}
                        </span>
                    </div>
                    <p className="text-[10px] opacity-70 italic leading-tight">{result.quality.description}</p>

                    <div className="flex justify-between items-center">
                        <span className={themeClasses.textSecondary}>Cân đối (Vai/Mặt):</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${result.face.isSymmetric ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                            {result.face.isSymmetric ? "CÂN ĐỐI" : "LỆCH/NGHIÊNG"}
                        </span>
                    </div>
                    <p className="text-[10px] opacity-70 italic leading-tight">{result.face.description}</p>
                </div>
            </div>

            <div className={`mt-4 p-2 rounded-lg ${themeClasses.bgTertiary}/30 border border-sky-500/30`}>
                <p className={`text-[11px] font-bold ${themeClasses.accentText} mb-1 flex items-center`}>
                    <SparklesIcon /> GỢI Ý TỪ AI:
                </p>
                <p className="text-[11px] leading-relaxed italic">{result.recommendations}</p>
            </div>

            <div className={`mt-3 pt-2 border-t ${themeClasses.borderSecondary} text-center font-bold text-xs`}>
                {result.overallPass ? (
                    <span className="text-green-400 flex items-center justify-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        HỆ THỐNG SẴN SÀNG XỬ LÝ CAO CẤP
                    </span>
                ) : (
                    <span className="text-yellow-400 flex items-center justify-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        CẦN LƯU Ý KHI XỬ LÝ
                    </span>
                )}
            </div>
        </div>
    );
};

// --- CONSTANTS ---

const maleClothingOptions: { id: ClothingOption; label: string }[] = [
    { id: 'vest_nam', label: 'Áo Vest Xanh Đen' },
    { id: 'vest_nam_congso', label: 'Vest Công Sở Cao Cấp' },
    { id: 'vest_nam_den_no', label: 'Vest Đen (Nơ)' },
    { id: 'vest_nam_xam', label: 'Vest Xám' },
    { id: 'somi_nam_trang', label: 'Sơ-mi Trắng' },
    { id: 'somi_nam_xanh', label: 'Sơ-mi Xanh' },
    { id: 'somi_nam_hong', label: 'Sơ-mi Hồng Nhạt' },
    { id: 'somi_nam_den', label: 'Sơ-mi Đen' },
    { id: 'ao_thun_co_co', label: 'Polo Trắng' },
    { id: 'polo_nam_do', label: 'Polo Đỏ' },
    { id: 'ao_thun_den', label: 'Áo Thun Đen' },
    { id: 'graduation_gown', label: 'Áo & Mũ Tốt Nghiệp' },
    { id: 'aodai_nam_truyenthong', label: 'Áo Dài Ngũ Thân' },
];

const maleKidClothingOptions: { id: ClothingOption; label: string }[] = [
    { id: 'kid_boy_student', label: 'Học Sinh (Khăn Quàng)' },
    { id: 'kid_boy_vest', label: 'Vest Bé Trai (Nơ)' },
    { id: 'kid_boy_shirt_bow', label: 'Sơ mi Bé Trai (Nơ)' },
    { id: 'kid_boy_polo', label: 'Polo Bé Trai' },
    { id: 'kid_boy_shirt_white', label: 'Sơ mi Trắng' },
    { id: 'kid_boy_shirt_color', label: 'Sơ mi Màu' },
    { id: 'graduation_gown', label: 'Áo & Mũ Tốt Nghiệp' },
    { id: 'kid_boy_aodai_cachtan', label: 'Áo dài cách tân bé trai' },
];

const femaleClothingOptions: { id: ClothingOption; label: string }[] = [
    { id: 'vest_nu', label: 'Vest Công Sở' },
    { id: 'vest_nu_be', label: 'Vest Màu Be' },
    { id: 'vest_nu_den', label: 'Vest Đen' },
    { id: 'somi_nu_trang', label: 'Sơ-mi Trắng' },
    { id: 'somi_nu_xanh', label: 'Sơ-mi Xanh' },
    { id: 'somi_nu_no', label: 'Sơ-mi Cổ Nơ' },
    { id: 'ao_dai_trang', label: 'Áo Dài Trắng' },
    { id: 'aodai_do', label: 'Áo Dài Đỏ' },
    { id: 'aodai_xanh', label: 'Áo Dài Xanh' },
    { id: 'yem_hong', label: 'Yếm Hồng' },
    { id: 'ao_kieu_xanh_ngoc', label: 'Kiểu Xanh Ngọc' },
    { id: 'aodai_cachtan', label: 'Áo Dài Cách Tân' },
    { id: 'aodai_cachtan_gam', label: 'Áo Dài Cách Tân Gấm' },
    { id: 'aodai_cachtan_pastel', label: 'Cách Tân Pastel' },
    { id: 'aodai_cachtan_gem', label: 'Cách Tân Đá Quý' },
    { id: 'graduation_gown', label: 'Áo & Mũ Tốt Nghiệp' },
];

const femaleKidClothingOptions: { id: ClothingOption; label: string }[] = [
    { id: 'kid_girl_student', label: 'Học Sinh (Khăn Quàng)' },
    { id: 'kid_girl_dress', label: 'Váy Trắng Bé Gái' },
    { id: 'kid_girl_aodai', label: 'Áo Dài Bé Gái' },
    { id: 'kid_girl_shirt_white', label: 'Sơ mi Trắng' },
    { id: 'kid_girl_shirt_color', label: 'Sơ mi Màu' },
    { id: 'graduation_gown', label: 'Áo & Mũ Tốt Nghiệp' },
    { id: 'kid_girl_aodai_cachtan', label: 'Áo dài cách tân bé gái' },
];

const maleHairOptions: { id: HairOption; label: string }[] = [
    { id: 'keep_original', label: 'Giữ nguyên' },
    { id: 'short_neat', label: 'Ngắn gọn gàng' },
    { id: 'side_part', label: 'Rẽ ngôi' },
    { id: 'light_curl', label: 'Uốn xoăn nhẹ' },
    { id: 'two_block', label: 'Two-block' },
    { id: 'eboy', label: 'E-boy rủ' },
    { id: 'buzz_cut', label: 'Buzz cut' },
];

const femaleHairOptions: { id: HairOption; label: string }[] = [
    { id: 'keep_original', label: 'Giữ nguyên' },
    { id: 'long_straight', label: 'Dài thẳng' },
    { id: 'long_wavy', label: 'Dài gợn sóng' },
    { id: 'layer_curl', label: 'Layer uốn xoăn' },
    { id: 'short_bob', label: 'Bob ngắn' },
    { id: 'french_bob', label: 'Bob kiểu Pháp' },
    { id: 'pixie', label: 'Tém Pixie' },
    { id: 'wolf_cut', label: 'Wolf hiện đại' },
];

const backgroundPalette = [
  { name: 'Trắng', hex: '#FFFFFF' },
  { name: 'Xám Rất Nhạt', hex: '#F0F0F0' },
  { name: 'Xám Nhạt', hex: '#E0E0E0' },
  { name: 'Xanh Dương Nhạt', hex: '#D6EAF8' },
  { name: 'Xanh Dương', hex: '#A9CCE3' },
  { name: 'Xanh Đậm', hex: '#5499C7' },
];

const gradientOptions = [
    { name: 'Xanh - Trắng', css: 'linear-gradient(to bottom, #a1c4fd, #c2e9fb)', desc: 'Blue to White gradient' },
    { name: 'Xám - Trắng', css: 'linear-gradient(to bottom, #fdfbfb, #ebedee)', desc: 'White to Grey gradient' },
    { name: 'Tối Chuyên Nghiệp', css: 'linear-gradient(to bottom, #29323c, #485563)', desc: 'Dark Grey professional gradient' },
    { name: 'Hoàng Hôn', css: 'linear-gradient(to bottom, #a18cd1, #fbc2eb)', desc: 'Sunset Pastel gradient' },
];

const patternOptions = [
    { name: 'Vân Mây', desc: 'Abstract mottled studio canvas texture' },
    { name: 'Bokeh', desc: 'Soft abstract bokeh lights background' },
    { name: 'Văn Phòng', desc: 'Blurred modern office background' },
    { name: 'Thư Viện', desc: 'Blurred library bookshelf background' },
];

const defaultIdOptions = {
    gender: 'male' as Gender,
    clothing: null as ClothingOption | null,
    clothingCustomization: '',
    backgroundType: 'solid' as BackgroundType,
    background: '', // Stores color name, gradient name, pattern desc, or custom prompt
    smoothSkin: 'none' as SkinSmoothingLevel,
    skinTexture: 'medium' as SkinTextureLevel,
    poreVisibility: 'natural' as PoreVisibilityLevel,
    skinTone: 'default' as SkinTone,
    hairStyle: null as HairOption | null,
    hair: '', // Legacy string input, kept for compatibility if needed or custom input
    aspectRatio: '4x6' as AspectRatioID,
    accessories: '',
    adjustLighting: 'none' as AdjustmentLevel,
    increaseContrast: 'none' as AdjustmentLevel,
    increaseSharpness: 'none' as AdjustmentLevel,
    colorTemperature: 'normal' as ColorTemp,
    whiteBalance: 'neutral' as WhiteBalance,
    faceEnhancement: 'default' as FaceEnhancementLevel,
    resolutionBoost: 'none' as UpscaleLevel,
    facialRetouching: {
        brightenEyes: false,
        evenEyeSkin: false,
        smoothFineLines: false,
        lightMakeup: false,
        acneRemoval: false,
        teethWhitening: false,
    }
};

const defaultRestoreOptions = {
    workflow: 'standard' as RestorationWorkflow,
    damageTypes: {
        scratchesAndDust: false,
        tearsAndFolds: false,
        waterStains: false,
        missingParts: false,
    },
    colorize: false,
    colorizeStyle: 'natural' as ColorizeStyle,
    colorizationIntensity: 'balanced' as ColorIntensity,
    cinematicSaturation: 'medium' as 'low' | 'medium' | 'high', 
    cinematicContrast: 'medium' as 'low' | 'medium' | 'high',
    enhanceFaces: false,
    resolutionBoost: 'none' as UpscaleLevel,
    denoiseLevel: 'none' as DenoiseLevel,
    sharpnessStrength: 'medium' as Intensity,
    proVintageEffect: 'none' as ProVintageEffect,
    // New Skin Detail Options for Restore
    skinTexture: 'medium' as SkinTextureLevel,
    poreVisibility: 'natural' as PoreVisibilityLevel,
};

const defaultRestoreEngines = {
      supir: false,
      gfpgan: false,
      realesrgan: false,
      codeformer: false,
      diffbir: false,
};

const defaultAdvancedTech = {
    hdr: false,
    microDetails: 'off' as MicroDetailLevel,
    smartLight: false,
};

const DEFAULT_ID_PROMPT = "";

const App: React.FC = () => {
  const [theme, setTheme] = useState<ThemeName>(() => {
    const saved = localStorage.getItem('app-theme');
    // Safety check: ensure saved theme is valid, otherwise default to dark
    if (saved && themes[saved as ThemeName]) {
        return saved as ThemeName;
    }
    return 'dark';
  });
  
  const [mode, setMode] = useState<Mode>('id');
  const [rawOriginalImage, setRawOriginalImage] = useState<ImageFile | null>(null);
  const [originalImage, setOriginalImage] = useState<ImageFile | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [idHistory, setIdHistory] = useState<HistoryItem[]>([]);
  const [restoreHistory, setRestoreHistory] = useState<HistoryItem[]>([]);
  const [customPrompt, setCustomPrompt] = useState<string>(DEFAULT_ID_PROMPT);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [customBackgroundImage, setCustomBackgroundImage] = useState<ImageFile | null>(null);
  
  // Undo/Redo State
  const [editStack, setEditStack] = useState<string[]>([]);
  const [currentEditIndex, setCurrentEditIndex] = useState(-1);

  // AI Model Selection State
  const [selectedModel, setSelectedModel] = useState<ModelType>('flash');

  // Advanced Tech State
  const [advancedTech, setAdvancedTech] = useState(defaultAdvancedTech);
  const [activeAdvancedTab, setActiveAdvancedTab] = useState<AdvancedTab>('adjustments');

  // New State for Delete Confirmation Modal
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem('custom_gemini_api_key') || '');
  
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);

  const historyContainerRef = React.useRef<HTMLDivElement>(null);

  const scrollHistory = (direction: 'left' | 'right') => {
    if (historyContainerRef.current) {
      const scrollAmount = 300;
      historyContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleTestApiKey = async () => {
    if (!customApiKey.trim()) return;
    setIsTestingKey(true);
    setTestResult(null);
    try {
        const ai = new GoogleGenAI({ apiKey: customApiKey.trim() });
        // Correct usage for newer SDK: ai.models.generateContent
        await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: [{ text: "Hi" }] }
        });
        setTestResult({ success: true, message: "Kết nối thành công! Key hoạt động tốt." });
    } catch (e: any) {
        setTestResult({ success: false, message: "Lỗi: " + (e.message || "Key không hợp lệ hoặc không có quyền truy cập.") });
    } finally {
        setIsTestingKey(false);
    }
  };

  const handleSaveApiKey = () => {
    if (customApiKey.trim()) {
        localStorage.setItem('custom_gemini_api_key', customApiKey.trim());
    } else {
        localStorage.removeItem('custom_gemini_api_key');
    }
    setShowApiKeyModal(false);
    window.location.reload(); // Reload to apply new key
  };
  
  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<IdAnalysisResult | null>(null);
  
  // Optimize Prompt State
  const [isOptimizingPrompt, setIsOptimizingPrompt] = useState(false);

  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');

  const themeClasses = themes[theme] || themes.dark; // Fallback safety

  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    document.body.className = `${themeClasses.bgPrimary} ${themeClasses.textPrimary}`;
  }, [theme, themeClasses]);

  // Load presets on mount
  useEffect(() => {
      const savedPresets = localStorage.getItem('app-presets');
      if (savedPresets) {
          try {
              setPresets(JSON.parse(savedPresets));
          } catch (e) {
              console.error("Failed to load presets", e);
          }
      }
  }, []);

  // ID Photo specific state
  const [idOptions, setIdOptions] = useState(defaultIdOptions);
  
  // Restore specific state
  const [restoreEffect, setRestoreEffect] = useState<RestoreEffect | null>(null);
  const [restoreEngines, setRestoreEngines] = useState(defaultRestoreEngines);

  const [restoreOptions, setRestoreOptions] = useState(defaultRestoreOptions);
  const [restoreCustomPrompt, setRestoreCustomPrompt] = useState<string>('');


  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setRawOriginalImage(null);
    setOriginalImage(null);
    setEditedImage(null);
    setEditStack([]);
    setCurrentEditIndex(-1);
    setCustomPrompt(newMode === 'id' ? DEFAULT_ID_PROMPT : '');
    setIsLoading(false);
    setError(null);
    setRestoreEffect(null);
    setRestoreEngines(defaultRestoreEngines);
    setAdvancedTech(defaultAdvancedTech); // Reset advanced tech
    setRestoreOptions(defaultRestoreOptions);
    setRestoreCustomPrompt('');
    setIdOptions(defaultIdOptions);
    setActiveAdvancedTab('adjustments');
    setAnalysisResult(null);
    setIsOptimizingPrompt(false);
    setCustomBackgroundImage(null);
  };

  const handleGenderChange = (gender: Gender) => {
      // When switching gender, reset clothing and hair options to avoid confusion
      setIdOptions({
          ...idOptions,
          gender: gender,
          clothing: null,
          hairStyle: null,
      });
  };

  const handleAspectRatioChange = async (ratio: AspectRatioID) => {
      setIdOptions(prev => ({ ...prev, aspectRatio: ratio }));
      
      if (mode === 'id' && rawOriginalImage) {
          if (ratio === 'original' || ratio === 'free') {
              setOriginalImage(rawOriginalImage);
          } else {
              let targetRatio = 1;
              if (ratio === '3x4') targetRatio = 3/4;
              if (ratio === '4x6') targetRatio = 4/6;
              if (ratio === '1:1') targetRatio = 1;

              try {
                  let croppedBase64: string;
                  if (analysisResult?.face?.boundingBox) {
                      croppedBase64 = await smartCropImageToBase64(rawOriginalImage.base64, rawOriginalImage.mimeType, targetRatio, analysisResult.face.boundingBox as [number, number, number, number]);
                  } else {
                      croppedBase64 = await cropImageToBase64(rawOriginalImage.base64, rawOriginalImage.mimeType, targetRatio);
                  }
                  
                  setOriginalImage({
                      ...rawOriginalImage,
                      base64: croppedBase64
                  });
              } catch (e) {
                  console.error("Crop failed", e);
                  setOriginalImage(rawOriginalImage);
              }
          }
      }
  };

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        setError('Vui lòng tải lên một tệp ảnh hợp lệ (PNG, JPG, etc.).');
        return;
    }
    
    setError(null);
    setEditedImage(null);
    setEditStack([]);
    setCurrentEditIndex(-1);
    setAnalysisResult(null);

    try {
        const base64 = await fileToBase64(file);
        const newImage = { base64, mimeType: file.type, name: file.name };
        setRawOriginalImage(newImage);
        
        let finalImage = newImage;
        
        // Auto-crop if in ID mode and a ratio is selected
        if (mode === 'id' && idOptions.aspectRatio !== 'original' && idOptions.aspectRatio !== 'free') {
            let targetRatio = 1;
            if (idOptions.aspectRatio === '3x4') targetRatio = 3/4;
            if (idOptions.aspectRatio === '4x6') targetRatio = 4/6;
            if (idOptions.aspectRatio === '1:1') targetRatio = 1;
            
            try {
                const croppedBase64 = await cropImageToBase64(base64, file.type, targetRatio);
                finalImage = { ...newImage, base64: croppedBase64 };
            } catch (cropErr) {
                console.error("Initial crop failed", cropErr);
            }
        }
        
        setOriginalImage(finalImage);

        // --- AUTO ANALYSIS RE-ENABLED (Quota Saving Mode) ---
        // Automatically analyze to detect gender and switch options
        if (mode === 'id') {
            handleAnalyze(finalImage, newImage);
        }
        // --- AUTO ANALYSIS END ---

    } catch (e) {
        setError('Không thể đọc tệp ảnh.');
        console.error(e);
    }
  }, [mode, idOptions.aspectRatio]); // Added dependency on mode and aspectRatio

  const handleBackgroundUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            setError('Vui lòng tải lên một tệp ảnh nền hợp lệ (PNG, JPG).');
            return;
        }

        try {
            const base64 = await fileToBase64(file);
            setCustomBackgroundImage({ base64, mimeType: file.type, name: file.name });
        } catch (e) {
            setError('Không thể đọc tệp ảnh nền.');
        }
  };

  const handleAnalyze = async (img?: ImageFile, rawImg?: ImageFile) => {
    const targetImage = img || originalImage;
    const targetRawImage = rawImg || rawOriginalImage;

    if (!targetImage || !targetRawImage) return;
    setIsAnalyzing(true);
    setError(null);
    try {
        const result = await analyzeImageAttributes(targetImage);
        setAnalysisResult(result);

        // Auto-switch gender options based on analysis
        if (mode === 'id') {
            if (result.gender === 'Nam' || result.gender === 'Trẻ em (Nam)') {
                setIdOptions(prev => ({ ...prev, gender: 'male' }));
            } else if (result.gender === 'Nữ' || result.gender === 'Trẻ em (Nữ)') {
                setIdOptions(prev => ({ ...prev, gender: 'female' }));
            }
        }

        // Perform smart re-crop if bounding box is found
        if (mode === 'id' && result.face?.boundingBox && idOptions.aspectRatio !== 'original' && idOptions.aspectRatio !== 'free') {
            let targetRatio = 1;
            if (idOptions.aspectRatio === '3x4') targetRatio = 3/4;
            if (idOptions.aspectRatio === '4x6') targetRatio = 4/6;
            if (idOptions.aspectRatio === '1:1') targetRatio = 1;

            try {
                const smartCroppedBase64 = await smartCropImageToBase64(targetRawImage.base64, targetRawImage.mimeType, targetRatio, result.face.boundingBox as [number, number, number, number]);
                setOriginalImage(prev => prev ? { ...prev, base64: smartCroppedBase64 } : null);
            } catch (smartCropErr) {
                console.error("Manual smart crop failed", smartCropErr);
            }
        }
    } catch (e) {
        setError("Không thể phân tích ảnh: " + (e instanceof Error ? e.message : "Lỗi lạ"));
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleOptimizePrompt = async () => {
      // Decide which prompt to optimize based on mode
      let currentText = '';
      if (mode === 'id') currentText = customPrompt;
      else if (mode === 'restore') currentText = restoreCustomPrompt;

      if (!currentText.trim()) return;

      setIsOptimizingPrompt(true);
      try {
          const optimized = await refinePrompt(currentText, mode);

          if (mode === 'id') {
              setCustomPrompt(optimized);
          } else if (mode === 'restore') {
              setRestoreCustomPrompt(optimized);
          }
      } catch (e) {
          console.error("Optimization failed", e);
      } finally {
          setIsOptimizingPrompt(false);
      }
  };

  // Preset Handlers
  const handleOpenSavePresetModal = () => {
      setPresetNameInput('');
      setShowSavePresetModal(true);
  };

  const handleSavePresetConfirm = () => {
      const presetName = presetNameInput.trim();
      if (!presetName) return;

      // Check for duplicate names
      const existingIndex = presets.findIndex(p => p.name === presetName && p.mode === mode);
      
      if (existingIndex !== -1) {
          if (!window.confirm(`Cấu hình "${presetName}" đã tồn tại. Bạn có muốn ghi đè lên không?`)) {
              return;
          }
      }

      const newPresetData = mode === 'id' 
            ? { options: idOptions, prompt: customPrompt, advanced: advancedTech }
            : { options: restoreOptions, effect: restoreEffect, engines: restoreEngines, prompt: restoreCustomPrompt, advanced: advancedTech }; // Include Restore specific state

      const newPreset: Preset = {
          id: existingIndex !== -1 ? presets[existingIndex].id : Date.now().toString(),
          name: presetName,
          mode: mode,
          data: newPresetData
      };

      let updatedPresets;
      if (existingIndex !== -1) {
          updatedPresets = [...presets];
          updatedPresets[existingIndex] = newPreset;
      } else {
          updatedPresets = [...presets, newPreset];
      }

      setPresets(updatedPresets);
      localStorage.setItem('app-presets', JSON.stringify(updatedPresets));
      setShowSavePresetModal(false);
  };

  const handleLoadPreset = (presetId: string) => {
      const preset = presets.find(p => p.id === presetId);
      if (!preset) return;

      if (preset.mode === 'id') {
          // Merge with default options to ensure no undefined fields if preset is old
          setIdOptions({ ...defaultIdOptions, ...preset.data.options });
          setCustomPrompt(preset.data.prompt || '');
      } else {
          setRestoreOptions({ ...defaultRestoreOptions, ...preset.data.options });
          setRestoreEffect(preset.data.effect);
          // Handle legacy or new engine structure
          if (preset.data.engines) {
              setRestoreEngines({ ...defaultRestoreEngines, ...preset.data.engines });
          } else if (preset.data.engine) {
               // Backward compatibility
               setRestoreEngines({
                  supir: preset.data.engine === 'supir',
                  gfpgan: preset.data.engine === 'gfpgan',
                  realesrgan: preset.data.engine === 'realesrgan',
                  codeformer: false,
                  diffbir: false
               });
          } else {
              setRestoreEngines(defaultRestoreEngines);
          }
          setRestoreCustomPrompt(preset.data.prompt || '');
      }
      if (preset.data.advanced) {
          // Backwards compatibility for microDetails (bool to string)
          let advanced = preset.data.advanced;
          if (typeof advanced.microDetails === 'boolean') {
              advanced.microDetails = advanced.microDetails ? 'medium' : 'off';
          }
          setAdvancedTech({ ...defaultAdvancedTech, ...advanced });
      }
  };

  const handleDeletePreset = (presetId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (window.confirm("Bạn có chắc chắn muốn xóa cấu hình này?")) {
          const updatedPresets = presets.filter(p => p.id !== presetId);
          setPresets(updatedPresets);
          localStorage.setItem('app-presets', JSON.stringify(updatedPresets));
      }
  };

  // Undo / Redo Handlers
  const handleUndo = () => {
    if (currentEditIndex > 0) {
      const newIndex = currentEditIndex - 1;
      setCurrentEditIndex(newIndex);
      setEditedImage(editStack[newIndex]);
    } else if (currentEditIndex === 0) {
      // Undo to initial state (no edited image)
      setCurrentEditIndex(-1);
      setEditedImage(null);
    }
  };

  const handleRedo = () => {
    if (currentEditIndex < editStack.length - 1) {
      const newIndex = currentEditIndex + 1;
      setCurrentEditIndex(newIndex);
      setEditedImage(editStack[newIndex]);
    }
  };


  const generateIdPrompt = useCallback(() => {
    // -----------------------------------------------------------
    // MODE: PRO / ULTIMATE (Gemini 3 Pro Logic)
    // -----------------------------------------------------------
    const isPro = selectedModel === 'pro';

    const parts = [
        isPro 
        ? "# HIGH-END STUDIO PORTRAIT (GEMINI 3 PRO)" 
        : "# PROFESSIONAL ID PHOTO TASK"
    ];

    parts.push(`
## 0. CONSTRAINTS
- **STRICT IDENTITY:** Maintain 100% facial features and bone structure.
- **HAIR:** Only tidy flyaways (gọn tóc). DO NOT change style/length unless asked.
- **POSTURE (MANDATORY):** Subject MUST sit straight, shoulders level, head facing directly forward (en face). Correct all tilts/leaning.
- **EARS (VÀNH TAI):** Both ears MUST be clearly visible, sharp, and well-defined. Do not blur.
- **SYMMETRY:** Perfect bilateral symmetry of face and shoulders.
- **MINIMALISM:** Preserve original character.
- **QUALITY:** Output MUST be Ultra High Definition (UHD), sharp, and clear. Maximize fine details in eyes, skin texture, and clothing fibers for large-scale printing.
    `);

    parts.push(
        isPro
        ? "Goal: Hyper-realistic studio portrait. 100% identity accuracy. 8K Ultra-HD quality for large printing."
        : "Goal: Professional portrait. Perfect identity preservation. 4K High-Definition output."
    );

    // AI ANALYSIS INTEGRATION
    if (analysisResult) {
        parts.push(`\n## SUBJECT CONTEXT (AI ANALYSIS)
- Gender/Age: ${analysisResult.gender} (${analysisResult.ageRange})
- Skin Condition: ${analysisResult.skinCondition}
- Current Attire: ${analysisResult.clothingStyle}
- Current Hair: ${analysisResult.hairStyle}
- Face Orientation: ${analysisResult.face?.isStraight ? "Straight" : "Tilted/Leaning"}
- Symmetry: ${analysisResult.face?.isSymmetric ? "Symmetric" : "Asymmetrical shoulders/posture"}
- AI Recommendation: ${analysisResult.recommendations}`);

        if (!analysisResult.face?.isStraight || !analysisResult.face?.isSymmetric) {
            parts.push(`- **CRITICAL POSTURE CORRECTION (REQUIRED):** The subject is currently ${!analysisResult.face?.isStraight ? "tilted/leaning" : "asymmetrical"}. You MUST forcefully straighten the posture, level the shoulders, and align the head to face perfectly forward. The final result MUST be a perfectly en-face studio portrait with zero tilt.`);
        }
        parts.push(`- **DETAIL ENHANCEMENT:** Sharpen and define the ears (vành tai) and facial contours to ensure maximum clarity.`);
    }

    // Section 1: Layout & Background
    const layoutParts = [];
    switch (idOptions.aspectRatio) {
        case '3x4': layoutParts.push("Crop: Standard portrait 3x4 ratio. Head and shoulders composition."); break;
        case '4x6': layoutParts.push("Crop: Standard portrait 4x6 ratio. Upper body composition."); break;
        case '1:1': layoutParts.push("Crop: Square 1:1 ratio."); break;
        case 'original': layoutParts.push("Crop: STRICTLY maintain original aspect ratio and pixel dimensions. Do not crop."); break;
        case 'free': break;
    }

    // NEW BACKGROUND LOGIC
    if (idOptions.backgroundType === 'custom' && customBackgroundImage) {
        layoutParts.push("Background: Use the provided supplementary image as the background. Perform high-quality compositing, matching lighting and perspective.");
    } else if (idOptions.background?.trim()) {
        const bgVal = idOptions.background.trim();
        if (idOptions.backgroundType === 'gradient') {
             layoutParts.push(`Background: Professional studio gradient backdrop. Style: ${bgVal}. Smooth transition, seamless floor.`);
        } else if (idOptions.backgroundType === 'pattern') {
             layoutParts.push(`Background: Studio backdrop with texture. Style: ${bgVal}. Soft focus (bokeh), depth of field applied to background.`);
        } else if (idOptions.backgroundType === 'custom') {
             layoutParts.push(`Background: Custom environment. Description: ${bgVal}. Ensure lighting matches this environment.`);
        } else {
            // Default Solid
            const isWhite = bgVal.toLowerCase().includes('trắng') || bgVal.toUpperCase() === '#FFFFFF';
            if (isWhite) {
                layoutParts.push(`Background: ABSOLUTE PURE WHITE (Hex #FFFFFF, RGB 255, 255, 255). 100% flat white, no shadows, no gradients, no texture. The background must be perfectly white.`);
            } else {
                layoutParts.push(`Background: Solid color ${bgVal}. Professional matte finish. Even lighting.`);
            }
        }
    }

    if (layoutParts.length > 0) {
        parts.push("\n## 1. COMPOSITION & ENVIRONMENT\n" + layoutParts.map(p => `- ${p}`).join("\n"));
    }

    // Section 2: Appearance & Clothing & Hair
    const appearanceParts = [];
    if (idOptions.clothingCustomization?.trim()) {
        appearanceParts.push(`Attire: "${idOptions.clothingCustomization.trim()}". Material: High-quality fabric with visible weave/texture. Fit: Tailored.`);
    } else if (idOptions.clothing) {
        let clothingDesc = "Attire Change: ";
        switch (idOptions.clothing) {
            // MALE
            case 'vest_nam': clothingDesc += "Men's premium dark navy wool suit, crisp white dress shirt, silk blue tie. Sartorial fit."; break;
            case 'vest_nam_congso': clothingDesc += "Men's professional business suit. Charcoal or Navy, crisp white shirt, conservative tie. Corporate standard."; break;
            case 'vest_nam_den_no': clothingDesc += "Men's black tuxedo, satin lapels, crisp white pleated shirt, black bow tie. Formal event standard."; break;
            case 'vest_nam_xam': clothingDesc += "Men's charcoal grey business suit, white shirt, modern tie. Professional texture."; break;
            case 'somi_nam_trang': clothingDesc += "Men's high-thread-count white dress shirt. Open collar (no tie). stiff collar structure."; break;
            case 'somi_nam_xanh': clothingDesc += "Men's light blue oxford shirt. Professional business casual."; break;
            case 'somi_nam_hong': clothingDesc += "Men's soft pink dress shirt. Elegant fabric."; break;
            case 'somi_nam_den': clothingDesc += "Men's black silk-blend dress shirt. Modern look."; break;
            case 'ao_thun_co_co': clothingDesc += "White premium cotton polo shirt. Clean pique texture."; break;
            case 'polo_nam_do': clothingDesc += "Deep red premium polo shirt."; break;
            case 'ao_thun_den': clothingDesc += "Black heavy-weight cotton t-shirt. Minimalist."; break;
            case 'aodai_nam_truyenthong': clothingDesc += "Traditional Vietnamese male Ao Dai (Ngu Than). Silk fabric with subtle brocade patterns. Cultural heritage style."; break;
            case 'graduation_gown': clothingDesc += "Academic graduation regalia. A professional black graduation gown with a colored hood (stole) and a matching black mortarboard (graduation cap) with a tassel. Academic achievement style."; break;
            
            // FEMALE
            case 'vest_nu': clothingDesc += "Women's tailored business blazer. Sharp lapels."; break;
            case 'vest_nu_be': clothingDesc += "Women's cream/beige tailored blazer. Soft linen or wool blend."; break;
            case 'vest_nu_den': clothingDesc += "Women's classic black formal blazer. structured shoulder."; break;
            case 'somi_nu_trang': clothingDesc += "Women's white silk button-down blouse. Flowy yet professional."; break;
            case 'somi_nu_xanh': clothingDesc += "Women's pale blue business shirt."; break;
            case 'somi_nu_no': clothingDesc += "Women's blouse with an elegant pussy-bow necktie."; break;
            case 'ao_dai_trang': clothingDesc += "Traditional Vietnamese white Ao Dai. Pure silk, flowy, high collar. Student/Formal style."; break;
            case 'aodai_do': clothingDesc += "Traditional Vietnamese red Ao Dai. Silk or velvet texture."; break;
            case 'aodai_xanh': clothingDesc += "Traditional Vietnamese blue Ao Dai. Elegant fabric drape."; break;
            case 'yem_hong': clothingDesc += "Traditional Vietnamese 'Yem' bodice (pink). Soft silk, lotus motif options. Historical artistic portrait style."; break;
            case 'ao_kieu_xanh_ngoc': clothingDesc += "Teal/Turquoise fashion blouse. Modern cut."; break;
            case 'aodai_cachtan': clothingDesc += "Modern stylized Ao Dai (Cach Tan). Contemporary cut, shorter panels. Material: Premium silk or organza. Color: Soft pastel or rich gem tone. Fashion-forward."; break;
            case 'aodai_cachtan_gam': clothingDesc += "Modern Brocade stylized Ao Dai (Cach Tan Gam). Rich texture with subtle traditional patterns. Premium silk/brocade blend. Elegant."; break;
            case 'aodai_cachtan_pastel': clothingDesc += "Modern stylized Ao Dai (Cach Tan Pastel). Soft, youthful pastel colors (mint, baby pink). Lightweight silk."; break;
            case 'aodai_cachtan_gem': clothingDesc += "Modern stylized Ao Dai (Gem Tone). Rich jewel tones (emerald, ruby, sapphire). Luxurious satin or silk. Sophisticated."; break;

            // CHILDREN - BOYS
            case 'kid_boy_student': clothingDesc += "Vietnamese elementary school boy uniform. White button-up shirt with a red scarf (Khan Quang Do) tied around the neck. Clean and neat student look."; break;
            case 'kid_boy_vest': clothingDesc += "Little boy's formal suit. Navy blue blazer, white shirt, and a cute bow tie. Handsome kid style."; break;
            case 'kid_boy_shirt_bow': clothingDesc += "Little boy's outfit. White button-up shirt with a red bow tie and suspenders. Cute and neat."; break;
            case 'kid_boy_polo': clothingDesc += "Little boy's white premium polo shirt. Clean and simple."; break;
            case 'kid_boy_shirt_white': clothingDesc += "Little boy's crisp white button-up dress shirt. Classic collar. Clean and neat."; break;
            case 'kid_boy_shirt_color': clothingDesc += "Little boy's solid colored dress shirt (Light Blue or Soft Green). Smart casual style."; break;
            case 'kid_boy_aodai_cachtan': clothingDesc += "Little boy's Modern Ao Dai (Cach Tan). Vibrant color (Red/Blue), traditional patterns (Dragon/Geometric). Comfortable fit."; break;

            // CHILDREN - GIRLS
            case 'kid_girl_student': clothingDesc += "Vietnamese elementary school girl uniform. White button-up shirt with a red scarf (Khan Quang Do). Neat hair."; break;
            case 'kid_girl_dress': clothingDesc += "Little girl's formal white dress. Lace details, puffy sleeves, cute collar. Angelic style."; break;
            case 'kid_girl_aodai': clothingDesc += "Little girl's traditional Ao Dai. Red or Pink silk with small floral patterns. Cute and cultural."; break;
            case 'kid_girl_shirt_white': clothingDesc += "Little girl's white blouse/shirt. Peter Pan collar or simple button-up. Neat and cute."; break;
            case 'kid_girl_shirt_color': clothingDesc += "Little girl's soft colored blouse (Pastel Pink or Blue). Cute buttons. Gentle style."; break;
            case 'kid_girl_aodai_cachtan': clothingDesc += "Little girl's Modern Ao Dai (Cach Tan). A-line skirt, bright floral patterns, cute design. Festive style."; break;
        }
        appearanceParts.push(clothingDesc);
    }

    if (idOptions.hairStyle) {
        let hairDesc = "Hair Style: ";
        switch (idOptions.hairStyle) {
            case 'keep_original': hairDesc += "STRICTLY KEEP ORIGINAL HAIR. Do not change the hairstyle, length, or color. Only clean up flyaways."; break;
            // Male
            case 'short_neat': hairDesc += "Men's short, neat business cut. Tapered sides, professional."; break;
            case 'side_part': hairDesc += "Classic side-part. Clean and structured."; break;
            case 'light_curl': hairDesc += "Soft textured curls. Natural movement."; break;
            case 'two_block': hairDesc += "Korean Two-block cut with layers. Modern style."; break;
            case 'eboy': hairDesc += "Curtain bangs (E-boy style), middle part. Soft flow."; break;
            case 'buzz_cut': hairDesc += "Buzz cut. Very short, clean, military grade."; break;
            // Female
            case 'long_straight': hairDesc += "Long straight hair. Sleek, shiny, glass hair texture."; break;
            case 'long_wavy': hairDesc += "Long wavy hair. Beach waves, voluminous."; break;
            case 'short_bob': hairDesc += "Classic Bob cut. Chin length, sharp lines."; break;
            case 'pixie': hairDesc += "Pixie cut. Short, textured, modern chic."; break;
            case 'layer_curl': hairDesc += "Layered cut with soft curls. Bouncy and voluminous."; break;
            case 'french_bob': hairDesc += "French Bob. Short, with bangs, textured ends. Chic."; break;
            case 'wolf_cut': hairDesc += "Modern Wolf cut. Shaggy layers, mullet-inspired, textured."; break;
        }
        appearanceParts.push(hairDesc);
    } else if (idOptions.hair?.trim()) {
         appearanceParts.push(`Hair Style: "${idOptions.hair.trim()}". Natural shine and volume.`);
    }

    if (idOptions.accessories?.trim()) {
        appearanceParts.push(`Accessories: "${idOptions.accessories.trim()}".`);
    }
    if (appearanceParts.length > 0) {
        parts.push("\n## 2. SUBJECT STYLING\n" + appearanceParts.map(p => `- ${p}`).join("\n"));
    }
    
    // Section 3: Enhancements
    const enhancementParts = [];
    
    // Skin Retouching
    if (idOptions.smoothSkin && idOptions.smoothSkin !== 'none') {
        const level = idOptions.smoothSkin;
        enhancementParts.push(`Skin Retouching (${level}): ${
            level === 'subtle' ? "Micro-frequency separation. Remove only temporary blemishes." :
            level === 'medium' ? "Commercial portrait standard. Even skin tone, retain pores." :
            "High-end beauty retouch. Porcelain finish but keep structural integrity."
        }`);
    }

    // Granular skin details (Decoupled from smoothSkin check to allow texture control even without smoothing)
    if (idOptions.poreVisibility === 'natural') enhancementParts.push("Pore Visibility: Natural. Retain 100% of natural skin pores and micro-texture.");
    else if (idOptions.poreVisibility === 'visible') enhancementParts.push("Pore Visibility: Visible. Enhance pore visibility for hyper-realism and sharpness.");
    else if (idOptions.poreVisibility === 'smooth') enhancementParts.push("Pore Visibility: Smooth. Soft-focus pores for a cleaner look.");

    if (idOptions.skinTexture === 'high') enhancementParts.push("Skin Texture: High-frequency detail emphasis. Crisp texture.");
    else if (idOptions.skinTexture === 'medium') enhancementParts.push("Skin Texture: Medium. Balanced detail.");
    else if (idOptions.skinTexture === 'low') enhancementParts.push("Skin Texture: Soft. Reduced texture emphasis.");

    
    // Skin Tone
    if (idOptions.skinTone && idOptions.skinTone !== 'default') {
        let toneDesc = "";
        switch (idOptions.skinTone) {
            case 'fair': toneDesc = "Fair/Porcelain complexion. Brighten skin tone naturally."; break;
            case 'rosy': toneDesc = "Rosy/Pinkish undertone. Healthy flush."; break;
            case 'golden': toneDesc = "Golden/Warm undertone. Radiant glow."; break;
            case 'tan': toneDesc = "Sun-kissed/Tan complexion. Bronze warmth."; break;
        }
        enhancementParts.push(`Skin Tone: ${toneDesc}. Ensure seamless transition with neck and hands.`);
    }

    // Light & Contrast
    if (idOptions.adjustLighting !== 'none') {
         enhancementParts.push("Lighting: Studio 3-point lighting setup (Key, Fill, Rim). Softbox diffusion. Catchlights in eyes.");
    }
    if (idOptions.increaseSharpness !== 'none') {
         enhancementParts.push("Sharpness: High acutance. Crisp eyelashes and iris details.");
    }

    // Face specific
    if (idOptions.faceEnhancement !== 'default') {
        const isProFace = idOptions.faceEnhancement === 'professional';
        enhancementParts.push(isProFace 
            ? "Face Enhancement (Professional): Activate Gemini 3 Pro advanced facial recovery. 8K texture generation. Perfect symmetry. Studio lighting on face. Fix eyes and lips with pixel-perfect precision."
            : "Face Enhancement (Advanced): Sharpen facial features. Improve eye clarity.");
    }

    // Micro retouching
    const micro = [];
    if (idOptions.facialRetouching?.brightenEyes) micro.push("Enhance iris clarity and catchlights, whiten sclera naturally");
    if (idOptions.facialRetouching?.evenEyeSkin) micro.push("Reduce under-eye darkness/circles while keeping skin structure");
    if (idOptions.facialRetouching?.smoothFineLines) micro.push("Soften fine expression lines (crows feet) subtly");
    if (idOptions.facialRetouching?.lightMakeup) micro.push("apply subtle natural makeup (professional look)");
    if (idOptions.facialRetouching?.acneRemoval) micro.push("remove acne/blemishes completely");
    if (idOptions.facialRetouching?.teethWhitening) micro.push("whiten teeth naturally");
    
    if (micro.length > 0) enhancementParts.push(`Micro-Retouching: ${micro.join(", ")}.`);

    // Upscale
    if (idOptions.resolutionBoost !== 'none') {
        enhancementParts.push(`Resolution: Upscale output by ${idOptions.resolutionBoost}. Hallucinate missing details using generative priors.`);
    }

    // White Balance
    if (idOptions.whiteBalance === 'neutral') enhancementParts.push("White Balance: Neutral grey card reference. Correct color casts.");
    if (idOptions.whiteBalance === 'auto_correct') enhancementParts.push("White Balance: Auto-correct. Fix lighting temperature.");

    if (enhancementParts.length > 0) {
        parts.push("\n## 3. IMAGE ENHANCEMENT\n" + enhancementParts.map(p => `- ${p}`).join("\n"));
    }

    // Section 4: Color
    const colorParts = [];
    if (idOptions.colorTemperature === 'warm') colorParts.push("Tone: Warm/Golden.");
    if (idOptions.colorTemperature === 'cool') colorParts.push("Tone: Cool/Clinical.");
    
    if (colorParts.length > 0) parts.push("\n## 4. COLOR GRADING\n" + colorParts.join("\n"));

    // Section 5: Tech 2025
    if (advancedTech.hdr || advancedTech.microDetails !== 'off' || advancedTech.smartLight) {
        parts.push("\n## 5. NEXT-GEN PROCESSING");
        if (advancedTech.hdr) parts.push("- HDR: Maximize dynamic range. Recover highlight details.");
        if (advancedTech.microDetails !== 'off') {
            const intensity = advancedTech.microDetails;
            parts.push(`- Micro-Details (${intensity}): Synthesize skin texture, fabric weave, and hair strands. Intensity: ${intensity}.`);
        }
        if (advancedTech.smartLight) parts.push("- Smart Lighting: Re-light subject based on 3D facial geometry.");
    }

    // Custom
    if (customPrompt?.trim()) {
        parts.push(`\n## 6. SPECIFIC INSTRUCTIONS\n- ${customPrompt.trim()}`);
    }

    // Strict Constraints for Pro
    if (isPro) {
        parts.push(`\n## 7. PRO CONSTRAINTS (STRICT)
- **Photorealistic output ONLY.**
- **Render Style:** Unreal Engine 5 Metahuman quality.
- **Lighting:** Physically based rendering (PBR) lighting logic.
- **Skin:** Subsurface scattering enabled. No plastic skin.
- **Eyes:** Must be perfectly symmetrical and sharp.
- **Hair:** Individual strands visible.
        `);
    }

    return parts.join("\n");
  }, [idOptions, customPrompt, selectedModel, advancedTech, customBackgroundImage]);
  
  const generateRestorePrompt = useCallback(() => {
    // -----------------------------------------------------------
    // MODE 1: PRO STUDIO (PHASE ONE IQ4) - JSON BASED LOGIC
    // -----------------------------------------------------------
    if (restoreOptions.workflow === 'pro_studio') {
        const parts = [
            "# PROFESSIONAL STUDIO RESTORATION TASK (PHASE ONE XF IQ4 EMULATION)",
            "Task: Image Edit - Ultimate Archival Restoration",
            "Goal: Turn old photo (including photos of photos) into a modern digital capture. Maintain background but enhance it to studio quality.",
        ];

        parts.push(`
## 0. GLOBAL CONSTRAINTS & IDENTITY PRESERVATION
- **STRICT IDENTITY:** Maintain 100% of the subject's facial features and bone structure.
- **HAIR INTEGRITY:** If the request is to "tidy" or "make neater" (gọn tóc), ONLY remove stray hairs and clean edges. DO NOT change the hairstyle, length, or volume unless explicitly asked to "change hairstyle".
- **MINIMALISM:** Preserve as much of the original image's character as possible while applying requested enhancements.
        `);

        // AI ANALYSIS INTEGRATION
        if (analysisResult) {
            parts.push(`\n## SUBJECT CONTEXT (AI ANALYSIS)
- Gender/Age: ${analysisResult.gender} (${analysisResult.ageRange})
- Skin Condition: ${analysisResult.skinCondition}
- Current Attire: ${analysisResult.clothingStyle}
- Current Hair: ${analysisResult.hairStyle}
- AI Recommendation: ${analysisResult.recommendations}`);
        }

        // 1. Preprocessing & Input Handling
        parts.push(`
## 1. PREPROCESSING & CLEANUP
- Detect and isolate original photo (crop out edges/tables).
- Perspective correction: Flatten page curvature, straighten alignment.
- Glare & Reflection: STRICT reduction. Reduce glare and reflections.
- Clean edges, remove hands or objects holding the photo.
        `);

        // 2. Camera Emulation
        parts.push(`
## 2. CAMERA EMULATION (PHASE ONE XF IQ4 150MP)
- Sensor: Trichromatic medium format sensor emulation. 16-bit color depth simulation for maximum tonal transition.
- Lens: Schneider Kreuznach 80mm LS f/2.8 Blue Ring. Mimic optical characteristics: zero distortion, tack sharp center, slight natural falloff.
- Dynamic Range: Target 15 stops of dynamic range. Deep shadow recovery without noise.
- Color Science: Phase One Color perfection. CRI (Color Rendering Index) target: 100.
- Rendering: Ultimate sharpness, "3D pop" via micro-contrast enhancement, cinematic rendering.
- Detail: Retain natural texture; avoid plastic look.
        `);

        // 3. Retouching Strategy
        parts.push(`
## 3. RETOUCHING STRATEGY (STRICT)
- **Skin:** Realistic warm neutral tone. Radiant but detailed. Remove skin imperfections completely. Uniform subtle glow.
- **Eyes:** Natural brown/gray iris (unless obvious otherwise). Avoid over-whitening whites. Enhance iris clarity.
- **Clothing:** Premium fabric look (fine weave), crisp edges. Moderate wrinkle reduction.
- **Damage:** Repair cracks, remove dust/scratches, remove stains, remove folds. Reconstruct missing parts (museum-grade).
        `);

        // 4. Background Policy
        parts.push(`
## 4. BACKGROUND POLICY
- **Preserve and Enhance:** Keep the original background context but upgrade quality.
- **Texture:** Remove paper grain and speckles completely.
- **Depth:** Add studio gradient with layered tones and soft atmospheric haze.
- **Contrast:** Medium-high with soft roll-off.
- **Fix:** Remove banding, external objects.
        `);

        // 5. Colorization
        if (restoreOptions.colorize) {
             let cinematicDetails = "";
             if (restoreOptions.colorizeStyle === 'cinematic') {
                 cinematicDetails = `Saturation: ${restoreOptions.cinematicSaturation}. Contrast: ${restoreOptions.cinematicContrast}. Split toning (Teal shadows, Orange highlights). Dramatic look.`;
             }

             parts.push(`
## 5. COLORIZATION (CINEMATIC)
- Style: Cinematic, natural, true-to-life. ${cinematicDetails}
- Skin Tone Accuracy: Very High.
- Background: Full, layered, realistic colors.
- Avoid: Exaggeration, color bleeding.
             `);
        }

        // 6. Vintage Film Emulation (Optional)
        if (restoreOptions.proVintageEffect && restoreOptions.proVintageEffect !== 'none') {
            parts.push("\n## 6. ARTISTIC FILM EMULATION");
            if (restoreOptions.proVintageEffect === 'kodak_portra') {
                parts.push("- Emulation: Kodak Portra 400. Characteristics: Warm skin tones, very fine grain, high exposure latitude, soft contrast.");
            } else if (restoreOptions.proVintageEffect === 'fuji_pro') {
                parts.push("- Emulation: Fujifilm Pro 400H. Characteristics: Cooler shadows, cyan-tinted highlights, soft pastel aesthetic.");
            } else if (restoreOptions.proVintageEffect === 'light_leaks') {
                parts.push("- Effect: Vintage Light Leaks. Subtle warm/reddish flares entering from edges. Dreamy aesthetic.");
            } else if (restoreOptions.proVintageEffect === 'organic_grain') {
                parts.push("- Effect: Organic Film Grain. Overlay subtle 35mm film grain structure to reduce 'digital' look. Increase textural perception.");
            }
        }
        
        // 7. Skin Detail (New)
        if (restoreOptions.enhanceFaces || restoreEngines.gfpgan || restoreEngines.codeformer) {
             parts.push("\n## 7. SKIN & MICRO-DETAIL");
             if (restoreOptions.poreVisibility === 'natural') parts.push("- Pore Visibility: Natural. Retain biological skin texture.");
             else if (restoreOptions.poreVisibility === 'visible') parts.push("- Pore Visibility: High. Emphasize texture for realism.");
             else parts.push("- Pore Visibility: Smooth. Soften skin texture.");
             
             if (restoreOptions.skinTexture === 'high') parts.push("- Skin Texture: High fidelity. Sharp details.");
             else if (restoreOptions.skinTexture === 'medium') parts.push("- Skin Texture: Medium. Balanced.");
             else parts.push("- Skin Texture: Soft. Reduced detail.");
        }

        // 8. Safety & Negative Constraints
        parts.push(`
## 8. CONSTRAINTS & NEGATIVE PROMPT
- **Do NOT:** Change face geometry or identity, change pose, add heavy makeup, over-smooth skin, over-sharpen halos.
- **Negative:** Paper grain, speckles, flat monochrome background, hands holding photo, photo edges visible, glare spots, crooked perspective, mudyy blacks, cartoonish colors.
        `);
        
        if (restoreCustomPrompt?.trim()) {
            parts.push(`\n## USER NOTES\n- ${restoreCustomPrompt.trim()}`);
        }
        
        return parts.join("\n");
    }

    // -----------------------------------------------------------
    // MODE 2: STANDARD RESTORATION (ORIGINAL LOGIC)
    // -----------------------------------------------------------
    const parts = ["# ADVANCED PHOTO RESTORATION & UPSCALING TASK"];
    const isPro = selectedModel === 'pro';
    
    parts.push(`
## 0. GLOBAL CONSTRAINTS & IDENTITY PRESERVATION
- **STRICT IDENTITY:** Maintain 100% of the subject's facial features and bone structure.
- **HAIR INTEGRITY:** If the request is to "tidy" or "make neater" (gọn tóc), ONLY remove stray hairs and clean edges. DO NOT change the hairstyle, length, or volume unless explicitly asked to "change hairstyle".
- **MINIMALISM:** Preserve as much of the original image's character as possible while applying requested enhancements.
    `);

    parts.push(isPro 
        ? "Goal: Perform professional-grade archival photo restoration. Maximize detail recovery, fidelity, and structural integrity." 
        : "Goal: Restore the input photo, improving clarity and fixing damage.");

    // Section 1: Engine Pipeline (Simulation)
    const activeEngineNames = [];
    let engineInstructions = [];
    
    if (restoreEngines.supir) {
        activeEngineNames.push("SUPIR");
        engineInstructions.push("- Use 'SUPIR' strategy: Leverage generative priors to hallucinate high-fidelity textures and details in degraded areas. Intelligent semantic understanding of scene.");
    }
    if (restoreEngines.gfpgan) {
        activeEngineNames.push("GFPGAN");
        engineInstructions.push("- Use 'GFPGAN' strategy: Specialized facial restoration. Correct geometric distortions in eyes/mouth. Restore pupils and iris details.");
    }
    if (restoreEngines.codeformer) {
        activeEngineNames.push("CodeFormer");
        engineInstructions.push("- Use 'CodeFormer' strategy: Robust face restoration transformer. Handle heavy degradation and motion blur significantly better than GANs. Preserve identity.");
    }
    if (restoreEngines.diffbir) {
        activeEngineNames.push("DiffBIR");
        engineInstructions.push("- Use 'DiffBIR' strategy: Diffusion-based blind image restoration. Excellent for background texture recovery and generalized de-blurring using latent priors.");
    }
    if (restoreEngines.realesrgan) {
        activeEngineNames.push("Real-ESRGAN");
        engineInstructions.push("- Use 'Real-ESRGAN' strategy: General-purpose sharpening, artifact removal (ringing/blocking), and edge enhancement.");
    }
    
    if (activeEngineNames.length > 0) {
        parts.push(`\n## 1. RESTORATION PIPELINE (${activeEngineNames.join(' + ')})\n` + engineInstructions.join("\n"));
    } else {
        parts.push("\n## 1. RESTORATION STRATEGY\n- Balanced Approach: Standard noise reduction and sharpening.");
    }

    // Section 2: Physical Damage Repair
    const damagePrompts = [];
    if (restoreOptions.damageTypes.scratchesAndDust) {
        damagePrompts.push("Physical Damage: Aggressively identify and inpaint scratches, dust specks, and film grain. Use context-aware filling for surface abrasions.");
    }
    if (restoreOptions.damageTypes.tearsAndFolds) {
        damagePrompts.push("Structural Damage: Reconstruct torn areas. Heal deep creases and folds. Ensure pattern continuity across the repaired seam.");
    }
    if (restoreOptions.damageTypes.waterStains) {
        damagePrompts.push("Chemical Damage: Neutralize water stains and discoloration. Equalize exposure in stained areas.");
    }
    if (restoreOptions.damageTypes.missingParts) {
        damagePrompts.push("Inpainting: Generatively fill missing corners or holes based on surrounding visual context.");
    }
    // Default cleanup
    if (damagePrompts.length === 0) {
        damagePrompts.push("General Cleanup: Remove minor sensor noise and slight blur.");
    }
    parts.push("\n## 2. DEFECT REMOVAL\n" + damagePrompts.map(p => `- ${p}`).join("\n"));

    // Section 3: Color & Tone
    const colorPrompts = [];
    if (restoreOptions.colorize) {
        let stylePrompt = "Natural and realistic colors.";
        switch (restoreOptions.colorizeStyle) {
            case 'vibrant': stylePrompt = "Vibrant, modern, and saturated colors. Pop aesthetic."; break;
            case 'pastel': stylePrompt = "Soft, pastel, dream-like vintage colors."; break;
            case 'cinematic': 
                stylePrompt = `Cinematic color grading. Saturation: ${restoreOptions.cinematicSaturation}. Contrast: ${restoreOptions.cinematicContrast}. Teal and orange shadows/highlights contrast.`; 
                break;
        }
        
        let intensityPrompt = "Standard color saturation.";
        switch (restoreOptions.colorizationIntensity) {
            case 'subtle': intensityPrompt = "Subtle/Pastel saturation."; break;
            case 'intense': intensityPrompt = "Deep, vivid, high saturation."; break;
        }

        colorPrompts.push(`Colorization: Apply Deep Learning based colorization. Style: ${stylePrompt} Intensity: ${intensityPrompt}. \n  - Skin tones: Natural, varying by ethnicity/context.\n  - Environment: Historically accurate colors.\n  - Avoid: Color bleeding.`);
    } else {
        colorPrompts.push("Tone Correction: Restore original dynamic range. Fix fading/yellowing. Correct white balance while preserving the vintage feel if not damaged.");
    }
    parts.push("\n## 3. COLOR & TONE\n" + colorPrompts.join("\n"));
    
    // Section 4: Details & Enhancement
    const detailPrompts = [];
    if (restoreOptions.enhanceFaces || restoreEngines.gfpgan || restoreEngines.codeformer) {
        detailPrompts.push("Facial Restoration: Prioritize facial landmarks. Sharpen eyes, define lips, and restore natural skin texture (avoid waxy/plastic look).");
         
        // Add Skin Detail controls
        if (restoreOptions.poreVisibility === 'natural') detailPrompts.push("Skin Pores: Natural visibility.");
        else if (restoreOptions.poreVisibility === 'visible') detailPrompts.push("Skin Pores: High visibility (sharp).");
        else detailPrompts.push("Skin Pores: Smooth.");

        if (restoreOptions.skinTexture === 'high') detailPrompts.push("Skin Texture: High detail fidelity.");
        else if (restoreOptions.skinTexture === 'medium') detailPrompts.push("Skin Texture: Medium detail.");
        else detailPrompts.push("Skin Texture: Soft detail.");
    }
    
    // Denoise
    if (restoreOptions.denoiseLevel === 'low') detailPrompts.push("Denoising: Low. Preserve subtle film grain.");
    if (restoreOptions.denoiseLevel === 'medium') detailPrompts.push("Denoising: Medium. Balance noise removal and detail.");
    if (restoreOptions.denoiseLevel === 'high') detailPrompts.push("Denoising: High. Remove all digital noise and grain for a clean look.");
    
    // Sharpness
    if (restoreOptions.sharpnessStrength === 'low') detailPrompts.push("Sharpness: Gentle.");
    if (restoreOptions.sharpnessStrength === 'medium') detailPrompts.push("Sharpness: Standard edge enhancement.");
    if (restoreOptions.sharpnessStrength === 'high') detailPrompts.push("Sharpness: Strong detail extraction.");

    // Upscale
    if (restoreOptions.resolutionBoost !== 'none') {
        detailPrompts.push(`Super-Resolution: Upscale image by factor ${restoreOptions.resolutionBoost}. Synthesize missing high-frequency details during upscaling.`);
    }
    parts.push("\n## 4. ENHANCEMENT & UPSCALING\n" + detailPrompts.map(p => `- ${p}`).join("\n"));

    // Section 5: Artistic Style
    if (restoreEffect) {
        parts.push("\n## 5. FINAL AESTHETIC");
        if (restoreEffect === 'film') parts.push("- Style: Vintage Film (Add subtle grain, slight vignette, retro color grading).");
        if (restoreEffect === 'sepia') parts.push("- Style: Sepia (Warm monochromatic antique tone).");
        if (restoreEffect === 'bw') parts.push("- Style: Black & White (High contrast, dramatic monochrome).");
    }
    
    // Section 6: Advanced Tech 2025 (Shared)
    const techParts = [];
    if (advancedTech.hdr) {
        techParts.push("HDR Processing: Recover detail in deep shadows and crushed blacks.");
    }
    if (advancedTech.microDetails !== 'off') {
        const intensity = advancedTech.microDetails;
        techParts.push(`Texture Synthesis (${intensity}): Generate micro-details (fabric weave, paper texture) to prevent 'smooth' AI look.`);
    }
    if (advancedTech.smartLight) {
        techParts.push("Smart Lighting & Global Illumination: Correct uneven lighting caused by camera flash or fading. Rebalance exposure for a natural look.");
    }
    if (techParts.length > 0) {
        parts.push("\n## 6. ADVANCED PROCESSING\n" + techParts.map(p => `- ${p}`).join("\n"));
    }

    if (restoreCustomPrompt?.trim()) {
        parts.push(`\n## 7. USER NOTES\n- ${restoreCustomPrompt.trim()}`);
    }
    
    return parts.join("\n");
  }, [restoreOptions, restoreEffect, restoreCustomPrompt, selectedModel, advancedTech, restoreEngines]);

  const finalEditPrompt = useMemo(() => {
    if (mode === 'id') return generateIdPrompt();
    if (mode === 'restore') return generateRestorePrompt();
    return '';
  }, [mode, generateIdPrompt, generateRestorePrompt]);

  const getOriginalImageSrc = useCallback(() => {
    if (!originalImage) return null;
    return `data:${originalImage.mimeType};base64,${originalImage.base64}`;
  }, [originalImage]);

  const handleSubmit = async (event?: React.FormEvent | React.MouseEvent) => {
    if(event) event.preventDefault();
    setIsLoading(true);
    setError(null);
    setEditedImage(null);

    let isStillLoading = true;
    const generationTimeout = setTimeout(() => {
        if (isStillLoading) {
            setIsLoading(false);
            setError("Quá trình xử lý mất quá nhiều thời gian (90s). Có thể do API Key của bạn đang bị giới hạn hoặc kết nối mạng chậm. Vui lòng thử lại sau vài phút.");
        }
    }, 90000); // 90 second global timeout

    try {
        console.log("Starting image generation process...");
        if (!originalImage) {
            isStillLoading = false;
            clearTimeout(generationTimeout);
            throw new Error('Vui lòng tải ảnh lên trước.');
        }

        // Optimize: Ensure image is not unnecessarily large for the AI editor (max 1536px)
        // This speeds up upload and processing time significantly
        console.log("Optimizing image for AI editor...");
        const optimizedBase64 = await resizeBase64Image(originalImage.base64, originalImage.mimeType, 1536);
        console.log("Image optimization complete.");
        const optimizedImage = { ...originalImage, base64: optimizedBase64 };

        if (mode === 'id' && !idOptions.clothing && !idOptions.clothingCustomization?.trim() && !idOptions.background?.trim() && idOptions.smoothSkin === 'none' && !customPrompt?.trim() && !idOptions.hair?.trim() && !idOptions.hairStyle && !idOptions.accessories?.trim() && idOptions.adjustLighting === 'none' && idOptions.increaseContrast === 'none' && idOptions.increaseSharpness === 'none' && idOptions.colorTemperature === 'normal' && idOptions.whiteBalance === 'neutral' && !advancedTech.hdr && advancedTech.microDetails === 'off' && !advancedTech.smartLight && idOptions.faceEnhancement === 'default' && idOptions.resolutionBoost === 'none' && !idOptions.facialRetouching?.brightenEyes && !idOptions.facialRetouching?.evenEyeSkin && !idOptions.facialRetouching?.smoothFineLines && !idOptions.facialRetouching?.lightMakeup && !idOptions.facialRetouching?.acneRemoval && !idOptions.facialRetouching?.teethWhitening && idOptions.skinTone === 'default' && idOptions.poreVisibility === 'natural' && idOptions.skinTexture === 'medium') {
            throw new Error('Vui lòng chọn ít nhất một tùy chọn chỉnh sửa hoặc nhập yêu cầu.');
        }
        
        // Pass the selected model state ('flash' or 'pro') to the service
        const editedBase64 = await editImageWithPrompt(
            optimizedImage, 
            finalEditPrompt, 
            selectedModel, 
            mode === 'id' && idOptions.backgroundType === 'custom' ? customBackgroundImage : null
        );
        
        if (!editedBase64) {
            throw new Error('AI không trả về dữ liệu hình ảnh. Vui lòng thử lại.');
        }

        console.log("AI Edit Successful. Image received.");
        const newEditedImageSrc = `data:${originalImage.mimeType};base64,${editedBase64}`;
        
        // --- UPDATE STATE WITH UNDO/REDO STACK ---
        const newStack = editStack.slice(0, currentEditIndex + 1);
        newStack.push(newEditedImageSrc);
        setEditStack(newStack);
        setCurrentEditIndex(newStack.length - 1);
        setEditedImage(newEditedImageSrc);
        
        // Update persistent history gallery
        if (mode === 'id') {
            setIdHistory(prev => [{ rawOriginal: rawOriginalImage, original: originalImage, edited: newEditedImageSrc }, ...prev].slice(0, 12));
        } else if (mode === 'restore') {
            setRestoreHistory(prev => [{ rawOriginal: rawOriginalImage, original: originalImage, edited: newEditedImageSrc }, ...prev].slice(0, 12));
        }
        
        isStillLoading = false;
        clearTimeout(generationTimeout);
    } catch (e) {
      console.error("Submission Error Details:", e);
      isStillLoading = false;
      clearTimeout(generationTimeout);
      if (e instanceof Error) { setError(e.message); } 
      else { setError('Một lỗi không mong muốn đã xảy ra.'); }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleHistoryClick = (item: HistoryItem) => {
    if (item.rawOriginal) {
        setRawOriginalImage(item.rawOriginal);
    } else if (item.original) {
        setRawOriginalImage(item.original);
    }

    if (item.original) {
        setOriginalImage(item.original);
    }
    setEditedImage(item.edited);
    // Reset undo/redo for new session from history
    setEditStack([item.edited]);
    setCurrentEditIndex(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearHistory = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const currentHistory = mode === 'id' ? idHistory : restoreHistory;
      if (currentHistory.length === 0) return;

      setShowClearHistoryConfirm(true);
  };

  const confirmClearHistory = () => {
        if (mode === 'id') {
            setIdHistory([]);
        } else if (mode === 'restore') {
            setRestoreHistory([]);
        }
        setShowClearHistoryConfirm(false);
  };

  const handleDownloadHighQuality = async () => {
    if (!editedImage) return;
    
    setIsLoading(true);
    try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = editedImage;
        
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });

        const canvas = document.createElement('canvas');
        // Target high resolution for printing (e.g., 300 DPI for a 4x6 photo is 1200x1800)
        // We'll scale up to 4000px on the long side for "Ultimate" quality
        const scaleFactor = 4000 / Math.max(img.width, img.height);
        canvas.width = img.width * scaleFactor;
        canvas.height = img.height * scaleFactor;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not get canvas context");

        // Use high quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Export as high quality JPEG (better for printing and large files)
        const highQualDataUrl = canvas.toDataURL('image/jpeg', 1.0);
        
        const link = document.createElement('a');
        link.href = highQualDataUrl;
        link.download = `HQ_${downloadFilename.replace('.png', '.jpg')}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err) {
        console.error("High quality download failed", err);
        // Fallback to standard download
        const link = document.createElement('a');
        link.href = editedImage;
        link.download = downloadFilename;
        link.click();
    } finally {
        setIsLoading(false);
    }
  };
  
  // Filename generator MMDDHHmmss.png
  const downloadFilename = useMemo(() => {
      const now = new Date();
      const pad = (num: number) => String(num).padStart(2, '0');
      return `${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.png`;
  }, [editedImage]);

  return (
    <div className={`min-h-screen transition-colors duration-500 ${themeClasses.bgPrimary} font-sans selection:bg-sky-500/30`}>
      {/* Navbar */}
      <nav className={`sticky top-0 z-50 backdrop-blur-md border-b ${themeClasses.border} ${themeClasses.bgSecondary}/80 shadow-sm`}>
        <div className="container mx-auto px-4 max-w-7xl h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.location.reload()}>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${themeClasses.gradientFrom} ${themeClasses.gradientTo} flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${themeClasses.gradientFrom} ${themeClasses.gradientTo} hidden sm:block`}>
              Studio AI Nguyễn Quang
            </h1>
          </div>

          <div className="relative">
             <button onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)} className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${themeClasses.navButton.hoverBg}`}>
                <div className={`w-5 h-5 rounded-full ${themes[theme].preview.bg} border border-current`}></div>
                <span className={`text-sm font-medium ${themeClasses.textPrimary} hidden sm:inline`}>{themes[theme].name}</span>
             </button>
             {isThemeMenuOpen && (
                 <div className={`absolute right-0 mt-2 w-48 py-2 rounded-xl shadow-xl border ${themeClasses.borderSecondary} ${themeClasses.bgSecondary} backdrop-blur-lg z-50`}>
                     {(Object.keys(themes) as ThemeName[]).map((t) => (
                         <button key={t} onClick={() => { setTheme(t); setIsThemeMenuOpen(false); }} className={`w-full px-4 py-2 text-left flex items-center space-x-3 hover:${themeClasses.bgTertiary}/50 transition-colors`}>
                            <div className={`w-4 h-4 rounded-full ${themes[t].preview.accent}`}></div>
                            <span className={`${themeClasses.textPrimary} text-sm`}>{themes[t].name}</span>
                         </button>
                     ))}
                 </div>
             )}
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT SIDEBAR: OPTIONS */}
            <div className="lg:col-span-4 space-y-6">
                
                {/* Mode Switcher */}
                <div className={`flex rounded-xl p-1 shadow-inner ${themeClasses.bgTertiary}`}>
                    <ModeNavButton targetMode="id" currentMode={mode} onClick={handleModeChange} themeClasses={themeClasses}>Ảnh Thẻ</ModeNavButton>
                    <ModeNavButton targetMode="restore" currentMode={mode} onClick={handleModeChange} themeClasses={themeClasses}>Phục Hồi</ModeNavButton>
                </div>
                
                {/* Model Selector */}
                <ModelSelector selectedModel={selectedModel} onSelect={setSelectedModel} themeClasses={themeClasses} />
                
                {/* Intro/Features */}
                {mode === 'id' && (
                    <FeatureBanner title="Chế độ Ảnh Thẻ AI" features={["Thay trang phục & phông nền tự động", "Làm mịn da & trang điểm AI", "Cân chỉnh ánh sáng studio", "Hỗ trợ kích thước chuẩn (3x4, 4x6)"]} themeClasses={themeClasses} />
                )}
                {mode === 'restore' && restoreOptions.workflow === 'standard' && (
                    <FeatureBanner title="Phục Hồi Ảnh Cũ" features={["Sửa vết rách, xước, ố mốc", "Làm nét ảnh mờ (Upscale 8x)", "Tô màu ảnh đen trắng tự động", "Tái tạo khuôn mặt rõ nét"]} themeClasses={themeClasses} />
                )}
                {mode === 'restore' && restoreOptions.workflow === 'pro_studio' && (
                    <FeatureBanner title="Studio Pro (Phase One)" features={["Giả lập Phase One IQ4 150MP", "Chuẩn bảo tàng (Archival Quality)", "Giữ nền gốc nhưng nâng cấp", "Xử lý da & chi tiết siêu thực"]} themeClasses={themeClasses} />
                )}

                {/* Presets Bar */}
                <div className={`flex items-center space-x-2 p-2 rounded-lg ${themeClasses.bgTertiary}/20 border ${themeClasses.borderSecondary}`}>
                    <select 
                        className={`flex-1 text-xs sm:text-sm bg-transparent border-none focus:ring-0 ${themeClasses.textSecondary}`}
                        onChange={(e) => handleLoadPreset(e.target.value)}
                        defaultValue=""
                    >
                        <option value="" disabled>-- Cấu hình đã lưu --</option>
                        {presets.filter(p => p.mode === mode).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    <button type="button" onClick={handleOpenSavePresetModal} title="Lưu cấu hình hiện tại" className={`p-1.5 rounded-md hover:${themeClasses.bgTertiary} ${themeClasses.textSecondary}`}>
                        <SaveIcon />
                    </button>
                    <button 
                        type="button" 
                        onClick={(e) => {
                            const select = e.currentTarget.previousElementSibling?.previousElementSibling as HTMLSelectElement;
                            if (select && select.value) handleDeletePreset(select.value, e as any);
                        }} 
                        title="Xóa cấu hình" 
                        className={`p-1.5 rounded-md hover:bg-red-500/20 text-red-400`}
                    >
                        <TrashIcon />
                    </button>
                </div>

                {/* MAIN FORM CONTAINER (Now just a div) */}
                <div className="space-y-6">
                    
                    {/* ID PHOTO OPTIONS */}
                    {mode === 'id' && (
                        <>
                            {/* GENDER SELECTION TOGGLE */}
                            <div className={`flex rounded-lg p-1 ${themeClasses.bgTertiary}/50 mb-2`}>
                                <button
                                    onClick={() => handleGenderChange('male')}
                                    className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${idOptions.gender === 'male' ? `${themeClasses.bgSecondary} ${themeClasses.textPrimary} shadow` : `${themeClasses.textSecondary} hover:${themeClasses.textPrimary}`}`}
                                >
                                    NAM
                                </button>
                                <button
                                    onClick={() => handleGenderChange('female')}
                                    className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${idOptions.gender === 'female' ? `${themeClasses.bgSecondary} ${themeClasses.textPrimary} shadow` : `${themeClasses.textSecondary} hover:${themeClasses.textPrimary}`}`}
                                >
                                    NỮ
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* COLUMN 1: CLOTHING (Filtered by Gender) */}
                                <div>
                                    <h4 className={`text-sm font-bold ${themeClasses.textSecondary} mb-2`}>Trang phục ({idOptions.gender === 'male' ? 'Nam' : 'Nữ'})</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="grid grid-cols-2 gap-1 mb-2">
                                                {idOptions.gender === 'male' ? (
                                                    maleClothingOptions.map(opt => (
                                                        <OptionButton key={opt.id} active={idOptions.clothing === opt.id} onClick={() => setIdOptions({...idOptions, clothing: opt.id, clothingCustomization: ''})} themeClasses={themeClasses}>{opt.label}</OptionButton>
                                                    ))
                                                ) : (
                                                    femaleClothingOptions.map(opt => (
                                                        <OptionButton key={opt.id} active={idOptions.clothing === opt.id} onClick={() => setIdOptions({...idOptions, clothing: opt.id, clothingCustomization: ''})} themeClasses={themeClasses}>{opt.label}</OptionButton>
                                                    ))
                                                )}
                                            </div>
                                            
                                            <h5 className={`text-xs font-bold ${themeClasses.textSecondary} mb-1 mt-3`}>Trẻ em</h5>
                                            <div className="grid grid-cols-2 gap-1">
                                                 {idOptions.gender === 'male' ? (
                                                    maleKidClothingOptions.map(opt => (
                                                        <OptionButton key={opt.id} active={idOptions.clothing === opt.id} onClick={() => setIdOptions({...idOptions, clothing: opt.id, clothingCustomization: ''})} themeClasses={themeClasses}>{opt.label}</OptionButton>
                                                    ))
                                                ) : (
                                                    femaleKidClothingOptions.map(opt => (
                                                        <OptionButton key={opt.id} active={idOptions.clothing === opt.id} onClick={() => setIdOptions({...idOptions, clothing: opt.id, clothingCustomization: ''})} themeClasses={themeClasses}>{opt.label}</OptionButton>
                                                    ))
                                                )}
                                            </div>

                                            <input
                                                type="text"
                                                placeholder="Mô tả chi tiết (chất liệu, kiểu dáng)..."
                                                className={`w-full mt-2 p-1.5 rounded-md text-xs border ${themeClasses.bgInput} ${themeClasses.borderSecondary} ${themeClasses.textPrimary} focus:ring-1 focus:ring-sky-500 focus:border-transparent outline-none transition-all`}
                                                value={idOptions.clothingCustomization}
                                                onChange={(e) => setIdOptions({...idOptions, clothing: null, clothingCustomization: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                {/* COLUMN 2: HAIR & BACKGROUND (Stacked, Filtered by Gender) */}
                                <div className="space-y-6">
                                    {/* Hair Style Section */}
                                    <div>
                                         <h4 className={`text-sm font-bold ${themeClasses.textSecondary} mb-2`}>Kiểu tóc ({idOptions.gender === 'male' ? 'Nam' : 'Nữ'})</h4>
                                         <div className="space-y-4 pt-1">
                                            <div>
                                                <div className="grid grid-cols-2 gap-1">
                                                    {idOptions.gender === 'male' ? (
                                                        maleHairOptions.map(opt => (
                                                            <OptionButton key={opt.id} active={idOptions.hairStyle === opt.id} onClick={() => setIdOptions({...idOptions, hairStyle: opt.id})} themeClasses={themeClasses}>{opt.label}</OptionButton>
                                                        ))
                                                    ) : (
                                                        femaleHairOptions.map(opt => (
                                                            <OptionButton key={opt.id} active={idOptions.hairStyle === opt.id} onClick={() => setIdOptions({...idOptions, hairStyle: opt.id})} themeClasses={themeClasses}>{opt.label}</OptionButton>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                         </div>
                                    </div>

                                    {/* Background & Adjustments Section (Moved from bottom) */}
                                    <div>
                                         <h4 className={`text-sm font-bold ${themeClasses.textSecondary} mb-2`}>Phông nền & Tinh chỉnh</h4>
                                         
                                         {/* Background Type Selector */}
                                         <div className="flex space-x-1 mb-2">
                                             <button onClick={() => setIdOptions({...idOptions, backgroundType: 'solid'})} className={`flex-1 text-[10px] py-1 rounded border ${idOptions.backgroundType === 'solid' ? 'bg-sky-500 text-white border-sky-600' : `${themeClasses.bgInput} ${themeClasses.borderSecondary} ${themeClasses.textSecondary}`}`}>Màu Đơn</button>
                                             <button onClick={() => setIdOptions({...idOptions, backgroundType: 'gradient'})} className={`flex-1 text-[10px] py-1 rounded border ${idOptions.backgroundType === 'gradient' ? 'bg-sky-500 text-white border-sky-600' : `${themeClasses.bgInput} ${themeClasses.borderSecondary} ${themeClasses.textSecondary}`}`}>Gradient</button>
                                             <button onClick={() => setIdOptions({...idOptions, backgroundType: 'pattern'})} className={`flex-1 text-[10px] py-1 rounded border ${idOptions.backgroundType === 'pattern' ? 'bg-sky-500 text-white border-sky-600' : `${themeClasses.bgInput} ${themeClasses.borderSecondary} ${themeClasses.textSecondary}`}`}>Hoa văn</button>
                                             <button onClick={() => setIdOptions({...idOptions, backgroundType: 'custom'})} className={`flex-1 text-[10px] py-1 rounded border ${idOptions.backgroundType === 'custom' ? 'bg-sky-500 text-white border-sky-600' : `${themeClasses.bgInput} ${themeClasses.borderSecondary} ${themeClasses.textSecondary}`}`}>Tùy chỉnh</button>
                                         </div>

                                         <div className="space-y-3">
                                            {idOptions.backgroundType === 'solid' && (
                                                <div className="flex flex-wrap gap-2">
                                                    {backgroundPalette.map(bg => (
                                                        <button
                                                            key={bg.hex}
                                                            type="button"
                                                            onClick={() => setIdOptions({...idOptions, background: bg.name})}
                                                            className={`w-8 h-8 rounded-full border-2 shadow-sm transition-transform hover:scale-110 ${idOptions.background === bg.name ? 'border-sky-500 scale-110' : 'border-gray-300'}`}
                                                            style={{ backgroundColor: bg.hex }}
                                                            title={bg.name}
                                                        />
                                                    ))}
                                                    <div className="relative w-8 h-8 overflow-hidden rounded-full border-2 border-gray-300 shadow-sm hover:scale-110 transition-transform flex items-center justify-center bg-white cursor-pointer group">
                                                        <span className="text-gray-500 text-xs font-bold">+</span>
                                                        <input 
                                                            type="color" 
                                                            className="absolute opacity-0 w-full h-full cursor-pointer top-0 left-0"
                                                            onChange={(e) => setIdOptions({...idOptions, background: e.target.value})}
                                                            title="Chọn màu tùy ý"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {idOptions.backgroundType === 'gradient' && (
                                                 <div className="grid grid-cols-2 gap-2">
                                                     {gradientOptions.map(g => (
                                                         <div 
                                                            key={g.name} 
                                                            onClick={() => setIdOptions({...idOptions, background: g.desc})}
                                                            className={`h-10 rounded-md cursor-pointer border-2 transition-all ${idOptions.background === g.desc ? 'border-sky-500 ring-1 ring-sky-500' : 'border-transparent hover:border-gray-400'}`}
                                                            style={{ background: g.css }}
                                                            title={g.name}
                                                         />
                                                     ))}
                                                 </div>
                                            )}

                                            {idOptions.backgroundType === 'pattern' && (
                                                 <div className="grid grid-cols-2 gap-1">
                                                     {patternOptions.map(p => (
                                                         <OptionButton key={p.name} active={idOptions.background === p.desc} onClick={() => setIdOptions({...idOptions, background: p.desc})} themeClasses={themeClasses}>
                                                             {p.name}
                                                         </OptionButton>
                                                     ))}
                                                 </div>
                                            )}

                                            {idOptions.backgroundType === 'custom' && (
                                                <div className="space-y-2">
                                                    <textarea 
                                                        className={`w-full p-2 rounded-md text-xs border ${themeClasses.bgInput} ${themeClasses.borderSecondary} ${themeClasses.textPrimary} focus:ring-1 focus:ring-sky-500 outline-none h-16 resize-none`}
                                                        placeholder="Mô tả bối cảnh..."
                                                        value={idOptions.background}
                                                        onChange={(e) => setIdOptions({...idOptions, background: e.target.value})}
                                                    />
                                                    <div className="relative">
                                                        <button className={`w-full flex items-center justify-center py-2 px-3 border border-dashed ${themeClasses.borderSecondary} rounded-md text-xs hover:${themeClasses.bgSecondary} transition-colors`}>
                                                            <UploadIcon />
                                                            <span className="ml-2 truncate">{customBackgroundImage ? customBackgroundImage.name : "Tải ảnh nền lên (Tùy chọn)"}</span>
                                                        </button>
                                                        <input 
                                                            type="file" 
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                            onChange={handleBackgroundUpload}
                                                            accept="image/*"
                                                        />
                                                    </div>
                                                    {customBackgroundImage && (
                                                        <div className="w-full h-16 rounded overflow-hidden border border-gray-600 relative">
                                                            <img src={`data:${customBackgroundImage.mimeType};base64,${customBackgroundImage.base64}`} alt="BG Preview" className="w-full h-full object-cover opacity-60" />
                                                            <button 
                                                                onClick={() => setCustomBackgroundImage(null)}
                                                                className="absolute top-1 right-1 bg-red-500/80 text-white rounded-full p-1 hover:bg-red-600"
                                                                title="Xóa ảnh nền"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            
                                            <div className="space-y-4"> {/* Changed from grid to stack for narrow column */}
                                                <div className="space-y-1">
                                                    <label className={`text-xs ${themeClasses.textSecondary}`}>Làm mịn da</label>
                                                    <div className="flex space-x-1">
                                                        {(['none', 'subtle', 'medium', 'strong'] as const).map(l => (
                                                            <OptionButton key={l} active={idOptions.smoothSkin === l} onClick={() => setIdOptions({...idOptions, smoothSkin: l})} themeClasses={themeClasses}>
                                                                {l === 'none' ? 'Tắt' : l === 'subtle' ? 'Nhẹ' : l === 'medium' ? 'Vừa' : 'Mạnh'}
                                                            </OptionButton>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className={`text-xs ${themeClasses.textSecondary}`}>Kích thước</label>
                                                    <div className="flex space-x-1">
                                                        <OptionButton active={idOptions.aspectRatio === 'original'} onClick={() => handleAspectRatioChange('original')} themeClasses={themeClasses}>Gốc</OptionButton>
                                                        <OptionButton active={idOptions.aspectRatio === '3x4'} onClick={() => handleAspectRatioChange('3x4')} themeClasses={themeClasses}>3x4</OptionButton>
                                                        <OptionButton active={idOptions.aspectRatio === '4x6'} onClick={() => handleAspectRatioChange('4x6')} themeClasses={themeClasses}>4x6</OptionButton>
                                                        <OptionButton active={idOptions.aspectRatio === '1:1'} onClick={() => handleAspectRatioChange('1:1')} themeClasses={themeClasses}>1:1</OptionButton>
                                                    </div>
                                                </div>
                                            </div>
                                         </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* ADVANCED TABBED INTERFACE */}
                            <div className="mt-4">
                                <div className={`flex border-b ${themeClasses.borderSecondary} mb-3`}>
                                    <button
                                        type="button"
                                        onClick={() => setActiveAdvancedTab('adjustments')}
                                        className={`flex-1 pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeAdvancedTab === 'adjustments' ? `border-sky-500 ${themeClasses.accentText}` : 'border-transparent text-gray-500'}`}
                                    >
                                        Tinh Chỉnh
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveAdvancedTab('ai2025')}
                                        className={`flex-1 pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeAdvancedTab === 'ai2025' ? `border-purple-500 text-purple-400` : 'border-transparent text-gray-500'}`}
                                    >
                                        AI 2025 (Beta)
                                    </button>
                                </div>

                                {activeAdvancedTab === 'adjustments' && (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-3 gap-2"> {/* Changed to 3 cols for better layout of new item */}
                                            <select 
                                                className={`w-full p-2 rounded-md text-xs border ${themeClasses.bgInput} ${themeClasses.borderSecondary} ${themeClasses.textPrimary}`}
                                                value={idOptions.skinTone}
                                                onChange={(e) => setIdOptions({...idOptions, skinTone: e.target.value as SkinTone})}
                                            >
                                                <option value="default">Tông da: Tự nhiên</option>
                                                <option value="fair">Trắng sáng</option>
                                                <option value="rosy">Hồng hào</option>
                                                <option value="golden">Ánh vàng</option>
                                                <option value="tan">Rám nắng</option>
                                            </select>
                                            <select 
                                                className={`w-full p-2 rounded-md text-xs border ${themeClasses.bgInput} ${themeClasses.borderSecondary} ${themeClasses.textPrimary}`}
                                                value={idOptions.adjustLighting}
                                                onChange={(e) => setIdOptions({...idOptions, adjustLighting: e.target.value as AdjustmentLevel})}
                                            >
                                                <option value="none">Ánh sáng: Gốc</option>
                                                <option value="low">Sáng nhẹ</option>
                                                <option value="medium">Studio</option>
                                            </select>
                                            <select 
                                                className={`w-full p-2 rounded-md text-xs border ${themeClasses.bgInput} ${themeClasses.borderSecondary} ${themeClasses.textPrimary}`}
                                                value={idOptions.whiteBalance}
                                                onChange={(e) => setIdOptions({...idOptions, whiteBalance: e.target.value as WhiteBalance})}
                                            >
                                                <option value="neutral">CB Trắng: Gốc</option>
                                                <option value="neutral">Trung tính</option>
                                                <option value="auto_correct">Tự động sửa</option>
                                            </select>
                                        </div>

                                        {/* Face Enhancement Selector */}
                                        <div className="space-y-1">
                                            <label className={`text-xs font-bold ${themeClasses.textSecondary}`}>Cường hóa khuôn mặt (Face Enhancement):</label>
                                            <div className="flex space-x-1">
                                                <OptionButton active={idOptions.faceEnhancement === 'default'} onClick={() => setIdOptions({...idOptions, faceEnhancement: 'default'})} themeClasses={themeClasses}>Mặc định</OptionButton>
                                                <OptionButton active={idOptions.faceEnhancement === 'advanced'} onClick={() => setIdOptions({...idOptions, faceEnhancement: 'advanced'})} themeClasses={themeClasses}>Nâng cao</OptionButton>
                                                <OptionButton active={idOptions.faceEnhancement === 'professional'} onClick={() => setIdOptions({...idOptions, faceEnhancement: 'professional'})} themeClasses={themeClasses}>Chuyên nghiệp</OptionButton>
                                            </div>
                                        </div>

                                        {/* Skin Detail Controls (Moved from AI 2025 for better access) */}
                                        <div className="space-y-2 pt-2 border-t border-gray-700/50">
                                            <div className="space-y-1">
                                                <label className={`text-xs font-medium ${themeClasses.textSecondary}`}>Độ rõ lỗ chân lông (Pores)</label>
                                                <div className="flex space-x-1">
                                                    <OptionButton active={idOptions.poreVisibility === 'smooth'} onClick={() => setIdOptions({...idOptions, poreVisibility: 'smooth'})} themeClasses={themeClasses}>Mịn</OptionButton>
                                                    <OptionButton active={idOptions.poreVisibility === 'natural'} onClick={() => setIdOptions({...idOptions, poreVisibility: 'natural'})} themeClasses={themeClasses}>Tự nhiên</OptionButton>
                                                    <OptionButton active={idOptions.poreVisibility === 'visible'} onClick={() => setIdOptions({...idOptions, poreVisibility: 'visible'})} themeClasses={themeClasses}>Rõ nét</OptionButton>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className={`text-xs font-medium ${themeClasses.textSecondary}`}>Kết cấu da (Texture)</label>
                                                <div className="flex space-x-1">
                                                    <OptionButton active={idOptions.skinTexture === 'low'} onClick={() => setIdOptions({...idOptions, skinTexture: 'low'})} themeClasses={themeClasses}>Mềm</OptionButton>
                                                    <OptionButton active={idOptions.skinTexture === 'medium'} onClick={() => setIdOptions({...idOptions, skinTexture: 'medium'})} themeClasses={themeClasses}>Vừa</OptionButton>
                                                    <OptionButton active={idOptions.skinTexture === 'high'} onClick={() => setIdOptions({...idOptions, skinTexture: 'high'})} themeClasses={themeClasses}>Chi tiết</OptionButton>
                                                </div>
                                            </div>
                                        </div>

                                         <div className="space-y-2 mt-2 pt-2 border-t border-gray-700/50">
                                            <p className={`text-xs font-bold ${themeClasses.textSecondary}`}>Chi tiết micro:</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <ToggleSwitch checked={idOptions.facialRetouching.brightenEyes} onChange={(c) => setIdOptions({...idOptions, facialRetouching: {...idOptions.facialRetouching, brightenEyes: c}})} label="Sáng mắt" themeClasses={themeClasses} />
                                                <ToggleSwitch checked={idOptions.facialRetouching.evenEyeSkin} onChange={(c) => setIdOptions({...idOptions, facialRetouching: {...idOptions.facialRetouching, evenEyeSkin: c}})} label="Khử thâm mắt" themeClasses={themeClasses} />
                                                <ToggleSwitch checked={idOptions.facialRetouching.smoothFineLines} onChange={(c) => setIdOptions({...idOptions, facialRetouching: {...idOptions.facialRetouching, smoothFineLines: c}})} label="Mờ nếp nhăn" themeClasses={themeClasses} />
                                                <ToggleSwitch checked={idOptions.facialRetouching.acneRemoval} onChange={(c) => setIdOptions({...idOptions, facialRetouching: {...idOptions.facialRetouching, acneRemoval: c}})} label="Trị mụn" themeClasses={themeClasses} />
                                                <ToggleSwitch checked={idOptions.facialRetouching.teethWhitening} onChange={(c) => setIdOptions({...idOptions, facialRetouching: {...idOptions.facialRetouching, teethWhitening: c}})} label="Trắng răng" themeClasses={themeClasses} />
                                                <ToggleSwitch checked={idOptions.facialRetouching.lightMakeup} onChange={(c) => setIdOptions({...idOptions, facialRetouching: {...idOptions.facialRetouching, lightMakeup: c}})} label="Trang điểm nhẹ" themeClasses={themeClasses} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeAdvancedTab === 'ai2025' && (
                                    <div className="space-y-3 p-2 rounded-lg bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30">
                                        <ToggleSwitch checked={advancedTech.hdr} onChange={(c) => setAdvancedTech({...advancedTech, hdr: c})} label="HDR Thông minh" themeClasses={themeClasses} />
                                        
                                        {/* Micro-Details Granular Control */}
                                        <div className="space-y-1 mt-2">
                                            <label className={`text-xs font-medium ${themeClasses.textSecondary}`}>Tái tạo chi tiết (Micro-Details)</label>
                                            <div className="flex space-x-1">
                                                <OptionButton active={advancedTech.microDetails === 'off'} onClick={() => setAdvancedTech({...advancedTech, microDetails: 'off'})} themeClasses={themeClasses}>Tắt</OptionButton>
                                                <OptionButton active={advancedTech.microDetails === 'low'} onClick={() => setAdvancedTech({...advancedTech, microDetails: 'low'})} themeClasses={themeClasses}>Nhẹ</OptionButton>
                                                <OptionButton active={advancedTech.microDetails === 'medium'} onClick={() => setAdvancedTech({...advancedTech, microDetails: 'medium'})} themeClasses={themeClasses}>Vừa</OptionButton>
                                                <OptionButton active={advancedTech.microDetails === 'high'} onClick={() => setAdvancedTech({...advancedTech, microDetails: 'high'})} themeClasses={themeClasses}>Cao</OptionButton>
                                            </div>
                                        </div>

                                        <ToggleSwitch checked={advancedTech.smartLight} onChange={(c) => setAdvancedTech({...advancedTech, smartLight: c})} label="Smart Relighting 3D" themeClasses={themeClasses} />
                                        
                                        {selectedModel === 'pro' && (
                                            <div className="text-[10px] text-purple-300 italic mt-1">* Các tính năng này hoạt động tốt nhất với model Gemini 3 Pro.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* RESTORE OPTIONS */}
                    {mode === 'restore' && (
                        <div className="mt-4">
                            {/* TABBED INTERFACE FOR RESTORE MODE */}
                            <div className={`flex border-b ${themeClasses.borderSecondary} mb-3`}>
                                <button
                                    type="button"
                                    onClick={() => setActiveAdvancedTab('adjustments')}
                                    className={`flex-1 pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeAdvancedTab === 'adjustments' ? `border-sky-500 ${themeClasses.accentText}` : 'border-transparent text-gray-500'}`}
                                >
                                    Tùy chọn phục hồi
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveAdvancedTab('ai2025')}
                                    className={`flex-1 pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeAdvancedTab === 'ai2025' ? `border-purple-500 text-purple-400` : 'border-transparent text-gray-500'}`}
                                >
                                    AI 2025 (Beta)
                                </button>
                            </div>

                            {activeAdvancedTab === 'adjustments' && (
                                <div className="space-y-4">
                                     <div className={`p-3 rounded-lg border ${themeClasses.borderSecondary} ${themeClasses.bgSecondary}/30`}>
                                        <label className={`text-sm font-bold ${themeClasses.textSecondary} mb-2 block`}>Chế độ phục hồi</label>
                                        <div className="flex space-x-2">
                                            <button 
                                                onClick={() => setRestoreOptions({...restoreOptions, workflow: 'standard'})}
                                                className={`flex-1 py-2 text-xs rounded-md border transition-all ${restoreOptions.workflow === 'standard' ? `bg-blue-600 border-blue-500 text-white shadow` : `${themeClasses.bgInput} ${themeClasses.borderSecondary} hover:border-gray-400`}`}
                                            >
                                                Tiêu chuẩn
                                            </button>
                                            <button 
                                                onClick={() => setRestoreOptions({...restoreOptions, workflow: 'pro_studio'})}
                                                className={`flex-1 py-2 text-xs rounded-md border transition-all ${restoreOptions.workflow === 'pro_studio' ? `bg-purple-600 border-purple-500 text-white shadow` : `${themeClasses.bgInput} ${themeClasses.borderSecondary} hover:border-gray-400`}`}
                                            >
                                                Pro Studio (IQ4)
                                            </button>
                                        </div>
                                     </div>

                                     <div className="space-y-2">
                                        <label className={`text-sm font-bold ${themeClasses.textSecondary}`}>Loại hư hại cần xử lý:</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            <ToggleSwitch checked={restoreOptions.damageTypes.scratchesAndDust} onChange={(c) => setRestoreOptions({...restoreOptions, damageTypes: {...restoreOptions.damageTypes, scratchesAndDust: c}})} label="Vết xước & Bụi" themeClasses={themeClasses} />
                                            <ToggleSwitch checked={restoreOptions.damageTypes.tearsAndFolds} onChange={(c) => setRestoreOptions({...restoreOptions, damageTypes: {...restoreOptions.damageTypes, tearsAndFolds: c}})} label="Vết rách & Gấp" themeClasses={themeClasses} />
                                        </div>
                                     </div>

                                     <div className="space-y-2">
                                         <label className={`text-sm font-bold ${themeClasses.textSecondary}`}>Màu sắc:</label>
                                         <ToggleSwitch checked={restoreOptions.colorize} onChange={(c) => setRestoreOptions({...restoreOptions, colorize: c})} label="Tô màu ảnh đen trắng" themeClasses={themeClasses} />
                                         {restoreOptions.colorize && (
                                             <div className="space-y-2 mt-2">
                                                <select 
                                                    className={`w-full p-2 rounded-md text-xs border ${themeClasses.bgInput} ${themeClasses.borderSecondary} ${themeClasses.textPrimary}`}
                                                    value={restoreOptions.colorizeStyle}
                                                    onChange={(e) => setRestoreOptions({...restoreOptions, colorizeStyle: e.target.value as ColorizeStyle})}
                                                >
                                                    <option value="natural">Tự nhiên</option>
                                                    <option value="vibrant">Sống động</option>
                                                    <option value="pastel">Màu Pastel (Cổ điển)</option>
                                                    <option value="cinematic">Điện ảnh (Màu sắc điện ảnh)</option>
                                                </select>
                                                
                                                {restoreOptions.colorizeStyle === 'cinematic' && (
                                                    <div className="p-2 border border-sky-500/30 rounded-md bg-sky-900/10 space-y-2">
                                                        <div className="space-y-1">
                                                            <label className={`text-xs ${themeClasses.textSecondary}`}>Độ bão hòa (Saturation)</label>
                                                            <div className="flex space-x-1">
                                                                {(['low', 'medium', 'high'] as const).map(l => (
                                                                    <OptionButton key={l} active={restoreOptions.cinematicSaturation === l} onClick={() => setRestoreOptions({...restoreOptions, cinematicSaturation: l})} themeClasses={themeClasses}>{l === 'low' ? 'Thấp' : l === 'medium' ? 'Vừa' : 'Cao'}</OptionButton>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className={`text-xs ${themeClasses.textSecondary}`}>Độ tương phản (Contrast)</label>
                                                            <div className="flex space-x-1">
                                                                {(['low', 'medium', 'high'] as const).map(l => (
                                                                    <OptionButton key={l} active={restoreOptions.cinematicContrast === l} onClick={() => setRestoreOptions({...restoreOptions, cinematicContrast: l})} themeClasses={themeClasses}>{l === 'low' ? 'Thấp' : l === 'medium' ? 'Vừa' : 'Cao'}</OptionButton>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                             </div>
                                         )}
                                     </div>
                                     
                                     {/* Sharpness Slider Control */}
                                     <div className="space-y-1">
                                        <label className={`text-sm font-bold ${themeClasses.textSecondary}`}>Độ sắc nét (Sharpness)</label>
                                        <div className="flex space-x-1">
                                            <OptionButton active={restoreOptions.sharpnessStrength === 'low'} onClick={() => setRestoreOptions({...restoreOptions, sharpnessStrength: 'low'})} themeClasses={themeClasses}>Nhẹ</OptionButton>
                                            <OptionButton active={restoreOptions.sharpnessStrength === 'medium'} onClick={() => setRestoreOptions({...restoreOptions, sharpnessStrength: 'medium'})} themeClasses={themeClasses}>Tiêu chuẩn</OptionButton>
                                            <OptionButton active={restoreOptions.sharpnessStrength === 'high'} onClick={() => setRestoreOptions({...restoreOptions, sharpnessStrength: 'high'})} themeClasses={themeClasses}>Cao cấp</OptionButton>
                                        </div>
                                     </div>

                                     {restoreOptions.workflow === 'standard' && (
                                         <div className="space-y-2">
                                            <label className={`text-sm font-bold ${themeClasses.textSecondary}`}>Mô hình xử lý (Engine):</label>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <label className="flex items-center space-x-2"><input type="checkbox" checked={restoreEngines.supir} onChange={(e) => setRestoreEngines({...restoreEngines, supir: e.target.checked})} className="rounded text-sky-500 bg-transparent" /> <span>SUPIR (Chi tiết)</span></label>
                                                <label className="flex items-center space-x-2"><input type="checkbox" checked={restoreEngines.gfpgan} onChange={(e) => setRestoreEngines({...restoreEngines, gfpgan: e.target.checked})} className="rounded text-sky-500 bg-transparent" /> <span>GFPGAN (Mặt)</span></label>
                                                <label className="flex items-center space-x-2"><input type="checkbox" checked={restoreEngines.codeformer} onChange={(e) => setRestoreEngines({...restoreEngines, codeformer: e.target.checked})} className="rounded text-sky-500 bg-transparent" /> <span>CodeFormer (Mặt)</span></label>
                                                <label className="flex items-center space-x-2"><input type="checkbox" checked={restoreEngines.diffbir} onChange={(e) => setRestoreEngines({...restoreEngines, diffbir: e.target.checked})} className="rounded text-sky-500 bg-transparent" /> <span>DiffBIR (Nền)</span></label>
                                            </div>
                                         </div>
                                     )}

                                     {/* PRO STUDIO EFFECTS (Only show in Pro Studio Workflow) */}
                                     {restoreOptions.workflow === 'pro_studio' && (
                                        <div className="space-y-2">
                                            <label className={`text-sm font-bold ${themeClasses.textSecondary}`}>Hiệu ứng phim cổ điển (Vintage Film):</label>
                                            <select 
                                                className={`w-full p-2 rounded-md text-xs border ${themeClasses.bgInput} ${themeClasses.borderSecondary} ${themeClasses.textPrimary}`}
                                                value={restoreOptions.proVintageEffect}
                                                onChange={(e) => setRestoreOptions({...restoreOptions, proVintageEffect: e.target.value as ProVintageEffect})}
                                            >
                                                <option value="none">Không (Clean Digital)</option>
                                                <option value="kodak_portra">Kodak Portra 400 (Ấm áp)</option>
                                                <option value="fuji_pro">Fujifilm Pro 400H (Mát)</option>
                                                <option value="light_leaks">Light Leaks (Cháy sáng nhẹ)</option>
                                                <option value="organic_grain">Hạt nhiễu phim (Organic Grain)</option>
                                            </select>
                                        </div>
                                     )}

                                     <div className="space-y-2">
                                        <label className={`text-sm font-bold ${themeClasses.textSecondary}`}>Upscale (Tăng độ phân giải):</label>
                                        <div className="flex space-x-1">
                                            <OptionButton active={restoreOptions.resolutionBoost === 'none'} onClick={() => setRestoreOptions({...restoreOptions, resolutionBoost: 'none'})} themeClasses={themeClasses}>Tắt</OptionButton>
                                            <OptionButton active={restoreOptions.resolutionBoost === '2x'} onClick={() => setRestoreOptions({...restoreOptions, resolutionBoost: '2x'})} themeClasses={themeClasses}>2x</OptionButton>
                                            <OptionButton active={restoreOptions.resolutionBoost === '4x'} onClick={() => setRestoreOptions({...restoreOptions, resolutionBoost: '4x'})} themeClasses={themeClasses}>4x</OptionButton>
                                            <OptionButton active={restoreOptions.resolutionBoost === '8x'} onClick={() => setRestoreOptions({...restoreOptions, resolutionBoost: '8x'})} themeClasses={themeClasses}>8x</OptionButton>
                                        </div>
                                     </div>
                                </div>
                            )}

                            {activeAdvancedTab === 'ai2025' && (
                                <div className="space-y-3 p-2 rounded-lg bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30">
                                    <ToggleSwitch checked={advancedTech.hdr} onChange={(c) => setAdvancedTech({...advancedTech, hdr: c})} label="HDR Thông minh" themeClasses={themeClasses} />
                                    
                                    {/* Restore Specific Skin Details */}
                                    <div className="space-y-2 mt-2">
                                        <div className="space-y-1">
                                            <label className={`text-xs font-medium ${themeClasses.textSecondary}`}>Độ rõ lỗ chân lông (Pores)</label>
                                            <div className="flex space-x-1">
                                                <OptionButton active={restoreOptions.poreVisibility === 'smooth'} onClick={() => setRestoreOptions({...restoreOptions, poreVisibility: 'smooth'})} themeClasses={themeClasses}>Mịn</OptionButton>
                                                <OptionButton active={restoreOptions.poreVisibility === 'natural'} onClick={() => setRestoreOptions({...restoreOptions, poreVisibility: 'natural'})} themeClasses={themeClasses}>Tự nhiên</OptionButton>
                                                <OptionButton active={restoreOptions.poreVisibility === 'visible'} onClick={() => setRestoreOptions({...restoreOptions, poreVisibility: 'visible'})} themeClasses={themeClasses}>Rõ nét</OptionButton>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className={`text-xs font-medium ${themeClasses.textSecondary}`}>Kết cấu da (Texture)</label>
                                            <div className="flex space-x-1">
                                                <OptionButton active={restoreOptions.skinTexture === 'low'} onClick={() => setRestoreOptions({...restoreOptions, skinTexture: 'low'})} themeClasses={themeClasses}>Mềm</OptionButton>
                                                <OptionButton active={restoreOptions.skinTexture === 'medium'} onClick={() => setRestoreOptions({...restoreOptions, skinTexture: 'medium'})} themeClasses={themeClasses}>Vừa</OptionButton>
                                                <OptionButton active={restoreOptions.skinTexture === 'high'} onClick={() => setRestoreOptions({...restoreOptions, skinTexture: 'high'})} themeClasses={themeClasses}>Chi tiết</OptionButton>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1 mt-2">
                                        <label className={`text-xs font-medium ${themeClasses.textSecondary}`}>Tái tạo chi tiết (Micro-Details)</label>
                                        <div className="flex space-x-1">
                                            <OptionButton active={advancedTech.microDetails === 'off'} onClick={() => setAdvancedTech({...advancedTech, microDetails: 'off'})} themeClasses={themeClasses}>Tắt</OptionButton>
                                            <OptionButton active={advancedTech.microDetails === 'low'} onClick={() => setAdvancedTech({...advancedTech, microDetails: 'low'})} themeClasses={themeClasses}>Nhẹ</OptionButton>
                                            <OptionButton active={advancedTech.microDetails === 'medium'} onClick={() => setAdvancedTech({...advancedTech, microDetails: 'medium'})} themeClasses={themeClasses}>Vừa</OptionButton>
                                            <OptionButton active={advancedTech.microDetails === 'high'} onClick={() => setAdvancedTech({...advancedTech, microDetails: 'high'})} themeClasses={themeClasses}>Cao</OptionButton>
                                        </div>
                                    </div>

                                    <ToggleSwitch checked={advancedTech.smartLight} onChange={(c) => setAdvancedTech({...advancedTech, smartLight: c})} label="Smart Relighting 3D" themeClasses={themeClasses} />
                                </div>
                            )}
                        </div>
                    )}
                    
                </div>
            </div>

            {/* RIGHT COLUMN: IMAGES & ACTIONS & HISTORY */}
            <div className="lg:col-span-8 flex flex-col gap-6">
                
                {/* 1. Images Display Area */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    
                    {/* Original Image Display */}
                    <div className="flex flex-col gap-3">
                        <div className="relative group">
                                <ImageDisplay 
                                title="Ảnh Gốc" 
                                imageSrc={getOriginalImageSrc()} 
                                placeholderText={mode === 'id' ? "Tải ảnh chân dung lên" : "Tải ảnh cũ cần phục hồi"}
                                themeClasses={themeClasses}
                                />
                                {/* Floating Upload Button (Icon only) */}
                                <label className="absolute top-4 right-4 p-2 bg-white/90 text-gray-800 rounded-full cursor-pointer shadow-lg hover:scale-110 transition-transform z-10" title="Tải ảnh lên">
                                <UploadIcon />
                                <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                                </label>
                        </div>

                        {/* Analysis Section (Moved OUTSIDE ImageDisplay) */}
                        {mode === 'id' && originalImage && (
                            <div className="w-full">
                                {!analysisResult ? (
                                    <button 
                                        onClick={handleAnalyze}
                                        disabled={isAnalyzing}
                                        className={`w-full flex items-center justify-center py-2 rounded-lg border ${themeClasses.borderSecondary} ${themeClasses.bgSecondary} ${themeClasses.textSecondary} hover:${themeClasses.textPrimary} hover:border-sky-500 transition-all font-medium text-sm shadow-sm`}
                                    >
                                        {isAnalyzing ? <Spinner /> : <><AnalyzeIcon /> Phân tích AI (Tiết kiệm Quota)</>}
                                    </button>
                                ) : (
                                    <div className="relative animate-fade-in-up">
                                        <AnalysisResultCard result={analysisResult} themeClasses={themeClasses} />
                                        <button 
                                            onClick={() => setAnalysisResult(null)} 
                                            className="absolute top-3 right-3 text-gray-400 hover:text-red-400 transition-colors"
                                            title="Đóng kết quả"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Result Image Display */}
                    <div>
                        <div className="relative">
                            <ImageDisplay 
                                title="Kết quả AI" 
                                imageSrc={editedImage} 
                                isLoading={isLoading} 
                                placeholderText="Kết quả sẽ hiển thị tại đây..." 
                                themeClasses={themeClasses} 
                                downloadable={true}
                                downloadFilename={downloadFilename}
                                onDownload={handleDownloadHighQuality}
                            />
                            {/* Undo/Redo Controls Overlay */}
                            {editStack.length > 0 && (
                                <div className="absolute top-4 left-4 flex space-x-2 z-10">
                                    <button 
                                        onClick={handleUndo} 
                                        disabled={currentEditIndex <= 0}
                                        className={`p-2 rounded-full shadow-lg bg-white/90 text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-all`}
                                        title="Hoàn tác"
                                    >
                                        <UndoIcon />
                                    </button>
                                    <button 
                                        onClick={handleRedo} 
                                        disabled={currentEditIndex >= editStack.length - 1}
                                        className={`p-2 rounded-full shadow-lg bg-white/90 text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-all`}
                                        title="Làm lại"
                                    >
                                        <RedoIcon />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Action Panel (Custom Request & Submit) */}
                <div className={`p-4 rounded-xl border ${themeClasses.borderSecondary} ${themeClasses.bgSecondary}/40 flex flex-col gap-4 shadow-sm`}>
                    <div className="flex justify-between items-center">
                            <label className={`text-sm font-bold ${themeClasses.accentText}`}>
                                {mode === 'id' ? 'Yêu cầu thêm (Tùy chọn) / Ghi chú' : 'Ghi chú phục hồi'}
                            </label>
                            <button 
                            type="button"
                            onClick={handleOptimizePrompt}
                            disabled={isOptimizingPrompt || (mode === 'id' ? !customPrompt.trim() : !restoreCustomPrompt.trim())}
                            className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50`}
                            >
                            {isOptimizingPrompt ? <Spinner /> : <><BrainIcon /> ✨ Tối ưu Prompt (AI)</>}
                            </button>
                    </div>
                    
                    <div className="space-y-2">
                        <textarea 
                            className={`w-full p-3 rounded-lg text-sm border ${themeClasses.bgInput} ${themeClasses.borderSecondary} ${themeClasses.textPrimary} focus:ring-2 focus:ring-sky-500 outline-none h-24 resize-none`}
                            placeholder={mode === 'id' ? "Ví dụ: Thêm kính cận gọng đen, giữ nốt ruồi trên má trái..." : "Ví dụ: Giữ lại dòng chữ viết tay ở góc ảnh, làm rõ biển số xe..."}
                            value={mode === 'id' ? customPrompt : restoreCustomPrompt}
                            onChange={(e) => mode === 'id' ? setCustomPrompt(e.target.value) : setRestoreCustomPrompt(e.target.value)}
                        />
                        {mode === 'id' && (
                            <div className={`text-[10px] ${themeClasses.textSecondary} flex items-start space-x-1`}>
                                <span className="text-yellow-500 mt-0.5">💡</span>
                                <span>
                                    <b>Mẹo:</b> Mô tả chi tiết những đặc điểm bạn muốn giữ lại (VD: "giữ nốt ruồi ở cằm", "giữ kính cận") hoặc muốn thay đổi cụ thể (VD: "thêm dây chuyền mảnh", "biểu cảm tự nhiên hơn").
                                </span>
                            </div>
                        )}
                    </div>
                    
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || !originalImage}
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transform transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${themeClasses.button.bg} ${themeClasses.button.text} ${themeClasses.button.hoverBg} flex items-center justify-center space-x-2`}
                    >
                        {isLoading ? (
                            <><Spinner /> <span>Đang xử lý...</span></>
                        ) : (
                            <><MagicWandIcon /> <span>{mode === 'id' ? 'Tạo Ảnh Thẻ AI' : 'Phục Hồi Ngay'}</span></>
                        )}
                    </button>
                </div>
                
                {/* 3. History Section (Bottom) */}
                <div className={`rounded-xl border ${themeClasses.borderSecondary} ${themeClasses.bgSecondary}/30 p-4 relative`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className={`text-lg font-bold ${themeClasses.textPrimary}`}>
                            Lịch sử {mode === 'id' ? 'Ảnh Thẻ' : 'Phục Hồi'}
                        </h3>
                        <div className="flex items-center space-x-2">
                            {((mode === 'id' && idHistory.length > 3) || (mode === 'restore' && restoreHistory.length > 3)) && (
                                <div className="hidden sm:flex items-center space-x-1 mr-2">
                                    <button 
                                        onClick={() => scrollHistory('left')}
                                        className={`p-1 rounded-full ${themeClasses.bgTertiary} ${themeClasses.textPrimary} hover:bg-sky-500 transition-colors shadow-sm`}
                                        title="Cuộn trái"
                                    >
                                        <ChevronLeftIcon />
                                    </button>
                                    <button 
                                        onClick={() => scrollHistory('right')}
                                        className={`p-1 rounded-full ${themeClasses.bgTertiary} ${themeClasses.textPrimary} hover:bg-sky-500 transition-colors shadow-sm`}
                                        title="Cuộn phải"
                                    >
                                        <ChevronRightIcon />
                                    </button>
                                </div>
                            )}
                            {((mode === 'id' && idHistory.length > 0) || (mode === 'restore' && restoreHistory.length > 0)) && (
                                <button 
                                    onClick={handleClearHistory}
                                    className="text-xs font-medium text-red-400 hover:text-red-300 flex items-center px-2 py-1 hover:bg-red-500/10 rounded transition-colors"
                                >
                                    <TrashIcon /> Xóa tất cả
                                </button>
                            )}
                        </div>
                    </div>

                    <div 
                        ref={historyContainerRef}
                        className="flex space-x-4 overflow-x-auto pb-4 custom-scrollbar snap-x scroll-smooth"
                    >
                        {(mode === 'id' ? idHistory : restoreHistory).map((item, index) => (
                            <div 
                                key={index} 
                                onClick={() => handleHistoryClick(item)}
                                className={`flex-shrink-0 w-64 snap-start cursor-pointer group relative rounded-lg overflow-hidden border ${themeClasses.borderSecondary} hover:border-sky-500 transition-all shadow-md`}
                            >
                                {/* Split view for ID/Restore */}
                                {item.original && (
                                    <div className="flex h-40 w-full">
                                        <div className="w-1/2 relative border-r border-white/10">
                                            <img src={`data:${item.original.mimeType};base64,${item.original.base64}`} className="w-full h-full object-cover" alt="Original" />
                                            <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1 rounded">Gốc</span>
                                        </div>
                                        <div className="w-1/2 relative">
                                            <img src={item.edited} className="w-full h-full object-cover" alt="Edited" />
                                            <span className="absolute bottom-1 right-1 text-[9px] bg-sky-600/80 text-white px-1 rounded">Mới</span>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-xs rounded-full font-medium border border-white/30">Xem lại</span>
                                </div>
                            </div>
                        ))}
                        {(mode === 'id' ? idHistory : restoreHistory).length === 0 && (
                            <div className={`w-full py-8 text-center text-sm ${themeClasses.textSecondary} italic`}>
                                Chưa có lịch sử nào.
                            </div>
                        )}
                    </div>
                </div>

            </div> {/* End Right Column */}

        </div>
      </div>
      
      {/* GLOBAL MODALS */}
      
      {/* Save Preset Modal */}
      {showSavePresetModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className={`${themeClasses.bgSecondary} border ${themeClasses.borderSecondary} rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100`}>
                <div className="p-5">
                    <h3 className={`text-lg font-bold ${themeClasses.textPrimary} mb-4`}>Lưu cấu hình hiện tại</h3>
                    <input 
                        type="text" 
                        placeholder="Đặt tên cho cấu hình này..." 
                        className={`w-full p-3 rounded-lg ${themeClasses.bgInput} ${themeClasses.borderSecondary} ${themeClasses.textPrimary} focus:ring-2 focus:ring-sky-500 outline-none mb-4`}
                        value={presetNameInput}
                        onChange={(e) => setPresetNameInput(e.target.value)}
                        autoFocus
                    />
                    <div className="flex justify-end space-x-3">
                        <button onClick={() => setShowSavePresetModal(false)} className={`px-4 py-2 rounded-lg text-sm font-medium ${themeClasses.textSecondary} hover:${themeClasses.bgTertiary}`}>Hủy</button>
                        <button onClick={handleSavePresetConfirm} disabled={!presetNameInput.trim()} className={`px-4 py-2 rounded-lg text-sm font-bold bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50`}>Lưu</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Clear History Confirmation Modal */}
      {showClearHistoryConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className={`${themeClasses.bgSecondary} border ${themeClasses.borderSecondary} rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100`}>
                <div className="p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                        <TrashIcon />
                    </div>
                    <h3 className={`text-lg font-bold ${themeClasses.textPrimary} mb-2`}>Xác nhận xóa lịch sử?</h3>
                    <p className={`text-sm ${themeClasses.textSecondary} mb-6`}>
                        Bạn có chắc chắn muốn xóa toàn bộ lịch sử của chế độ <b>{mode === 'id' ? 'Ảnh Thẻ' : 'Phục Hồi'}</b> không? Hành động này không thể hoàn tác.
                    </p>
                    <div className="flex justify-center space-x-3">
                        <button onClick={() => setShowClearHistoryConfirm(false)} className={`px-5 py-2.5 rounded-lg text-sm font-medium ${themeClasses.textSecondary} bg-gray-700/50 hover:bg-gray-700`}>Hủy bỏ</button>
                        <button onClick={confirmClearHistory} className="px-5 py-2.5 rounded-lg text-sm font-bold bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30">Xóa tất cả</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-red-500 text-white px-4 py-3 rounded-lg shadow-xl flex items-center animate-bounce-in">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
              <p className="font-bold">Lỗi</p>
              <p className="text-sm opacity-90">{error}</p>
              {(error.includes('Quota exceeded') || error.includes('403') || error.includes('API Key') || error.includes('GitHub')) && (
                  <button 
                    onClick={() => { setShowApiKeyModal(true); setError(null); }}
                    className="mt-2 px-3 py-1 bg-white text-red-600 text-xs font-bold rounded-md hover:bg-gray-100 transition-colors"
                  >
                    Cài đặt Key cá nhân ngay
                  </button>
              )}
          </div>
          <button onClick={() => setError(null)} className="ml-4 text-white hover:text-gray-200">✕</button>
        </div>
      )}
      {/* Footer */}
      <footer className={`mt-12 py-10 border-t ${themeClasses.borderSecondary} flex flex-col sm:flex-row items-center justify-center gap-4`}>
          <a 
              href="https://www.facebook.com/quangbg/" 
              target="_blank" 
              rel="noopener noreferrer"
              className={`flex items-center gap-3 px-6 py-3 rounded-full ${themeClasses.bgSecondary} border ${themeClasses.borderSecondary} hover:border-sky-500 transition-all shadow-lg group`}
          >
              <div className="p-2 bg-slate-700/50 rounded-lg group-hover:bg-slate-700 transition-colors">
                  <FacebookIcon />
              </div>
              <span className={`font-bold ${themeClasses.textPrimary}`}>Bản quyền : Nguyễn Quang</span>
          </a>

          <a 
              href="https://zalo.me/0982503882" 
              target="_blank" 
              rel="noopener noreferrer"
              className={`flex items-center gap-3 px-6 py-3 rounded-full ${themeClasses.bgSecondary} border ${themeClasses.borderSecondary} hover:border-sky-500 transition-all shadow-lg group`}
          >
              <div className="p-2 bg-slate-700/50 rounded-lg group-hover:bg-slate-700 transition-colors">
                  <PhoneIcon />
              </div>
              <span className={`font-bold ${themeClasses.textPrimary}`}>Zalo: 0982 503 882</span>
          </a>

          <button 
              onClick={() => setShowApiKeyModal(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest ${themeClasses.bgSecondary} border ${themeClasses.borderSecondary} text-gray-500 hover:text-sky-400 hover:border-sky-500 transition-all opacity-50 hover:opacity-100`}
          >
              <ChipIcon /> {localStorage.getItem('custom_gemini_api_key') ? 'Đã dùng Key riêng' : 'Dùng Key cá nhân (Bỏ giới hạn)'}
          </button>
      </footer>

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className={`${themeClasses.bgSecondary} border ${themeClasses.borderSecondary} rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in`}>
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className={`text-lg font-bold ${themeClasses.textPrimary} flex items-center`}>
                            <ChipIcon /> Cấu hình API Key cá nhân
                        </h3>
                        <button onClick={() => setShowApiKeyModal(false)} className="text-gray-400 hover:text-white">✕</button>
                    </div>
                    <p className={`text-xs ${themeClasses.textSecondary} mb-4 leading-relaxed`}>
                        Nếu bạn gặp lỗi <b>"Giới hạn lượt sử dụng (Quota exceeded)"</b>, bạn có thể nhập API Key Gemini của riêng mình để tiếp tục sử dụng không giới hạn.
                    </p>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className={`text-xs font-bold ${themeClasses.textSecondary}`}>Gemini API Key</label>
                            <input 
                                type="password" 
                                value={customApiKey}
                                onChange={(e) => setCustomApiKey(e.target.value)}
                                placeholder="Dán API Key của bạn tại đây..."
                                className={`w-full p-3 rounded-xl border ${themeClasses.bgInput} ${themeClasses.borderSecondary} ${themeClasses.textPrimary} focus:ring-2 focus:ring-sky-500 outline-none text-sm`}
                            />
                        </div>
                        
                        {testResult && (
                            <div className={`p-3 rounded-lg text-xs ${testResult.success ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                {testResult.message}
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-2">
                            <div className="flex flex-col">
                                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[10px] text-sky-400 hover:underline">Lấy API Key miễn phí tại đây →</a>
                                <button 
                                    onClick={handleTestApiKey} 
                                    disabled={isTestingKey || !customApiKey.trim()}
                                    className={`mt-2 text-[10px] font-bold uppercase tracking-wider ${isTestingKey ? 'text-gray-500' : 'text-sky-300 hover:text-sky-200'} transition-colors flex items-center`}
                                >
                                    {isTestingKey ? <><Spinner /> Đang kiểm tra...</> : '● Kiểm tra kết nối'}
                                </button>
                            </div>
                            <div className="flex space-x-2">
                                <button onClick={() => { setCustomApiKey(''); localStorage.removeItem('custom_gemini_api_key'); window.location.reload(); }} className={`px-4 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10`}>Xóa Key</button>
                                <button onClick={handleSaveApiKey} className={`px-6 py-2 rounded-lg text-xs font-bold bg-sky-500 text-white hover:bg-sky-600 shadow-lg shadow-sky-500/30`}>Lưu & Áp dụng</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;