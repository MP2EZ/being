import React from 'react';

/**
 * FullMind Design Library v1.1 - Final Complete Version
 * Last Updated: 2025-08-30
 * 
 * COMPREHENSIVE DESIGN SYSTEM
 * - Enhanced check-in themes (morning/daily/evening)
 * - Complete component library from prototype
 * - Optimized for Claude design work
 * - All colors, components, patterns included
 * 
 * CLAUDE USAGE:
 * - Copy colorSystem tokens directly
 * - Use theme-aware components: <Button theme="morning">
 * - Reference CLAUDE_QUICK_REF for shortcuts
 * - All components are copy-paste ready
 */

// ============================================
// ENHANCED COLOR SYSTEM - CLAUDE OPTIMIZED
// ============================================

export const colorSystem = {
  // Check-in Themes (PRIMARY FOR CLAUDE)
  themes: {
    morning: {
      primary: '#FF9F43',    // Continue buttons, progress
      success: '#E8863A',    // Completion states (darker)
      light: '#FFB366',      // Hover states, backgrounds
      background: '#FFF8F0'  // Section backgrounds
    },
    daily: {
      primary: '#4A90E2',    // Continue buttons, task priorities  
      success: '#2E5A95',    // Task completion (much darker)
      light: '#6BA3E8',      // Hover states, backgrounds
      background: '#F0F7FF'  // Section backgrounds
    },
    evening: {
      primary: '#4A7C59',    // Continue buttons, reflection progress
      success: '#2D5016',    // Reflection completion (much darker, more distinct)
      light: '#6B9B78',      // Hover states, backgrounds  
      background: '#F0F8F4'  // Section backgrounds
    }
  },

  // Base System Colors
  base: {
    white: '#FFFFFF',
    black: '#1C1C1C', 
    midnightBlue: '#1B2951'  // Logo, system metrics, general
  },

  // Gray Scale (8 levels)
  gray: {
    100: '#FAFAFA',  // Secondary backgrounds
    200: '#F5F5F5',  // Tertiary backgrounds, input backgrounds
    300: '#E8E8E8',  // Borders, dividers, inactive elements
    400: '#D1D1D1',  // Placeholder text, disabled borders
    500: '#B8B8B8',  // Inactive navigation, secondary text
    600: '#757575',  // Secondary text, captions
    700: '#424242',  // Tertiary text, less important
    800: '#212121'   // High contrast secondary text
  },

  // System Status
  status: {
    success: '#95B99C',  // Success states, completion, positive trends
    warning: '#F5C842',  // Warnings, caution, medium priority
    error: '#E8A5A5',    // Errors, critical alerts, negative trends
    info: '#4A90E2'      // Information, links, general accent
  },

  // Data Visualization
  data: {
    primary: '#4A90E2',    // Main data series, primary chart elements
    positive: '#95B99C',   // Positive trends, high values, success metrics
    accent: '#FF9F43',     // Secondary data series, highlights
    negative: '#E8A5A5',   // Negative trends, low values, concerns
    
    // Heat map progression (4 levels)
    heatMap: {
      minimal: '#F5F5F5',  // Lowest intensity
      low: '#E8E8E8',      // Low intensity
      medium: '#A8E6CF',   // Medium intensity  
      high: '#95B99C'      // High intensity
    },
    
    // Chart specific
    chartLine: '#6BA3E8',     // Secondary lines, grid lines
    chartAccentLight: '#FFB366',  // Hover states
    chartSuccessLight: '#A8E6CF'  // Positive area fills
  },

  // Navigation Shape Colors
  navigation: {
    home: '#FF6B9D',       // Triangle - home navigation
    checkins: '#2C5282',   // Square - check-ins navigation
    exercises: '#FF9F43',  // Star - exercises navigation  
    insights: '#A8E6CF'    // Circle - insights navigation
  }
};

// Legacy color exports (backward compatibility)
export const colors = {
  primary: colorSystem.base.white,
  secondary: colorSystem.gray[100], 
  tertiary: colorSystem.gray[200],
  accent: colorSystem.status.info,
  success: colorSystem.status.success,
  warning: colorSystem.status.warning,
  error: colorSystem.status.error,
  text: colorSystem.base.black,
  textSecondary: colorSystem.gray[600],
  border: colorSystem.gray[300],
  borderLight: colorSystem.gray[200],
  midnightBlue: colorSystem.base.midnightBlue,
  modules: colorSystem.themes
};

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64
};

export const typography = {
  headline1: { size: 34, weight: 700, spacing: -0.5 },
  headline2: { size: 28, weight: 600, spacing: -0.3 },
  headline3: { size: 22, weight: 600, spacing: 0 },
  bodyLarge: { size: 18, weight: 400, spacing: 0.2, lineHeight: 1.5 },
  bodyRegular: { size: 16, weight: 400, spacing: 0.1, lineHeight: 1.5 },
  caption: { size: 14, weight: 400, spacing: 0.2 },
  micro: { size: 12, weight: 500, spacing: 0.3 }
};

export const borderRadius = {
  small: 4, medium: 8, large: 12, xl: 16, full: 9999
};

// ============================================
// LOGO COMPONENT (60% FILL - SINGLE VERSION)
// ============================================

export const BrainIcon = ({ size = 24, color = colorSystem.base.midnightBlue }) => {
  // Generate stable unique ID
  const uniqueId = React.useId ? React.useId() : `brain-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const clipId = `brainClip-${uniqueId}`;
  
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ display: 'block' }}>
      <defs>
        <clipPath id={clipId}>
          <path d="M16 4C20 4 24 6 26 10C28 14 26 18 24 20C26 22 28 26 24 28C20 28 16 26 16 28C16 26 12 28 8 28C4 26 6 22 8 20C6 18 4 14 6 10C8 6 12 4 16 4Z" />
        </clipPath>
      </defs>
      <path 
        d="M16 4C20 4 24 6 26 10C28 14 26 18 24 20C26 22 28 26 24 28C20 28 16 26 16 28C16 26 12 28 8 28C4 26 6 22 8 20C6 18 4 14 6 10C8 6 12 4 16 4Z" 
        fill="white" 
        stroke={color} 
        strokeWidth="2"
      />
      {/* 60% fill - starts at y="12.8" */}
      <g clipPath={`url(#${clipId})`}>
        <rect x="0" y="12.8" width="32" height="19.2" fill={color} />
        <path 
          d="M0 12.8 Q8 10.8 16 12.8 T32 12.8 L32 13.8 Q24 15.8 16 13.8 T0 13.8 Z" 
          fill="white"
        />
      </g>
    </svg>
  );
};

// ============================================
// NAVIGATION SHAPES
// ============================================

export const NavShape = ({ shape, color, active = false, size = 24 }) => {
  const activeColor = active ? color : colorSystem.gray[500];
  
  switch (shape) {
    case 'triangle':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path d="M12 2 L22 20 L2 20 Z" fill={activeColor} />
        </svg>
      );
    case 'square':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="3" fill={activeColor} />
        </svg>
      );
    case 'star':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path d="M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 Z" fill={activeColor} />
        </svg>
      );
    case 'circle':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill={activeColor} />
        </svg>
      );
    default:
      return (
        <div style={{
          width: size, height: size, background: activeColor, borderRadius: '6px'
        }} />
      );
  }
};

// ============================================
// COMPREHENSIVE COLOR PALETTE COMPONENT
// ============================================

export const ColorPalette = () => {
  const ColorSwatch = ({ color, name, category, size = 32 }) => (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px',
      padding: '4px 0'
    }}>
      <div style={{
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: '6px',
        border: '1px solid #E8E8E8',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        flexShrink: 0
      }} />
      <div style={{ fontSize: '13px', flex: 1 }}>
        <div style={{ fontWeight: 500, color: colorSystem.base.black }}>{name}</div>
        <div style={{ color: colorSystem.gray[600], fontFamily: 'monospace', fontSize: '11px' }}>{color}</div>
      </div>
    </div>
  );

  const allColors = [
    // Check-in Themes
    { category: 'Morning Theme', colors: [
      { color: colorSystem.themes.morning.primary, name: 'Morning Primary' },
      { color: colorSystem.themes.morning.success, name: 'Morning Success' },
      { color: colorSystem.themes.morning.light, name: 'Morning Light' },
      { color: colorSystem.themes.morning.background, name: 'Morning Background' }
    ]},
    { category: 'Daily Theme', colors: [
      { color: colorSystem.themes.daily.primary, name: 'Daily Primary' },
      { color: colorSystem.themes.daily.success, name: 'Daily Success' },
      { color: colorSystem.themes.daily.light, name: 'Daily Light' },
      { color: colorSystem.themes.daily.background, name: 'Daily Background' }
    ]},
    { category: 'Evening Theme', colors: [
      { color: colorSystem.themes.evening.primary, name: 'Evening Primary' },
      { color: colorSystem.themes.evening.success, name: 'Evening Success' },
      { color: colorSystem.themes.evening.light, name: 'Evening Light' },
      { color: colorSystem.themes.evening.background, name: 'Evening Background' }
    ]},
    // Base Colors
    { category: 'Base System', colors: [
      { color: colorSystem.base.white, name: 'Pure White' },
      { color: colorSystem.base.black, name: 'Soft Black' },
      { color: colorSystem.base.midnightBlue, name: 'Midnight Blue' }
    ]},
    // Gray Scale
    { category: 'Gray Scale', colors: [
      { color: colorSystem.gray[100], name: 'Gray 100' },
      { color: colorSystem.gray[200], name: 'Gray 200' },
      { color: colorSystem.gray[300], name: 'Gray 300' },
      { color: colorSystem.gray[400], name: 'Gray 400' },
      { color: colorSystem.gray[500], name: 'Gray 500' },
      { color: colorSystem.gray[600], name: 'Gray 600' },
      { color: colorSystem.gray[700], name: 'Gray 700' },
      { color: colorSystem.gray[800], name: 'Gray 800' }
    ]},
    // System Status
    { category: 'System Status', colors: [
      { color: colorSystem.status.success, name: 'Success Green' },
      { color: colorSystem.status.warning, name: 'Warning Yellow' },
      { color: colorSystem.status.error, name: 'Error Red' },
      { color: colorSystem.status.info, name: 'Info Blue' }
    ]},
    // Data Visualization
    { category: 'Data Visualization', colors: [
      { color: colorSystem.data.primary, name: 'Data Primary' },
      { color: colorSystem.data.positive, name: 'Data Positive' },
      { color: colorSystem.data.accent, name: 'Data Accent' },
      { color: colorSystem.data.negative, name: 'Data Negative' },
      { color: colorSystem.data.heatMap.minimal, name: 'Heat Map Minimal' },
      { color: colorSystem.data.heatMap.low, name: 'Heat Map Low' },
      { color: colorSystem.data.heatMap.medium, name: 'Heat Map Medium' },
      { color: colorSystem.data.heatMap.high, name: 'Heat Map High' },
      { color: colorSystem.data.chartLine, name: 'Chart Line' },
      { color: colorSystem.data.chartAccentLight, name: 'Chart Accent Light' },
      { color: colorSystem.data.chartSuccessLight, name: 'Chart Success Light' }
    ]},
    // Navigation
    { category: 'Navigation', colors: [
      { color: colorSystem.navigation.home, name: 'Home Pink' },
      { color: colorSystem.navigation.checkins, name: 'Check-ins Blue' },
      { color: colorSystem.navigation.exercises, name: 'Exercises Orange' },
      { color: colorSystem.navigation.insights, name: 'Insights Green' }
    ]}
  ];

  return (
    <div style={{
      background: colorSystem.base.white,
      border: `1px solid ${colorSystem.gray[300]}`,
      borderRadius: `${borderRadius.large}px`,
      padding: `${spacing.lg}px`
    }}>
      <h3 style={{ 
        marginBottom: `${spacing.md}px`,
        fontSize: '18px',
        color: colorSystem.base.black
      }}>
        Complete Color Palette
      </h3>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: `${spacing.lg}px` 
      }}>
        {allColors.map((category, categoryIndex) => (
          <div key={categoryIndex}>
            <h4 style={{ 
              fontSize: '14px', 
              fontWeight: 600,
              color: colorSystem.gray[700],
              marginBottom: `${spacing.sm}px`,
              borderBottom: `1px solid ${colorSystem.gray[200]}`,
              paddingBottom: '4px'
            }}>
              {category.category}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {category.colors.map((colorItem, colorIndex) => (
                <ColorSwatch
                  key={colorIndex}
                  color={colorItem.color}
                  name={colorItem.name}
                  category={category.category}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// BASE COMPONENTS (THEME-AWARE & CLAUDE OPTIMIZED)
// ============================================

export const Button = ({ 
  children, 
  variant = 'primary', 
  onClick, 
  disabled = false, 
  style = {}, 
  moduleColor, // Legacy support
  theme = null, // 'morning', 'daily', 'evening'
  fullWidth = true 
}) => {
  let bgColor, textColor;
  
  if (disabled) {
    bgColor = colorSystem.gray[300];
    textColor = colorSystem.gray[500];
  } else if (theme) {
    bgColor = variant === 'success' ? colorSystem.themes[theme].success : colorSystem.themes[theme].primary;
    textColor = 'white';
  } else if (moduleColor) {
    bgColor = moduleColor;
    textColor = 'white';
  } else {
    bgColor = variant === 'primary' ? colorSystem.status.info :
              variant === 'secondary' ? colorSystem.gray[200] :
              variant === 'outline' ? 'transparent' :
              variant === 'success' ? colorSystem.status.success : colorSystem.status.info;
    textColor = (variant === 'primary' || variant === 'success') ? 'white' : colorSystem.base.black;
  }

  return (
    <button
      style={{
        width: fullWidth ? '100%' : 'auto',
        padding: '16px 24px',
        background: bgColor,
        color: textColor,
        border: variant === 'outline' ? `1px solid ${colorSystem.gray[300]}` : 'none',
        borderRadius: `${borderRadius.large}px`,
        fontSize: '16px',
        fontWeight: 500,
        cursor: disabled ? 'default' : 'pointer',
        marginBottom: '12px',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.2s ease',
        ...style
      }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export const Slider = ({ 
  label, 
  value, 
  onChange, 
  max = 10, 
  showEmoji = false,
  theme = null
}) => {
  const accentColor = theme ? colorSystem.themes[theme].primary : colorSystem.status.info;
  
  return (
    <div style={{ margin: '24px 0' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <span>{label}</span>
        <span style={{ color: accentColor, fontWeight: 500 }}>
          {value} {showEmoji && (value <= 3 ? '😔' : value <= 6 ? '😐' : '😊')}
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{
          height: '4px',
          background: colorSystem.gray[300],
          borderRadius: '2px'
        }}>
          <div style={{
            height: '100%',
            width: `${(value / max) * 100}%`,
            background: accentColor,
            borderRadius: '2px',
            transition: 'width 0.2s ease'
          }} />
        </div>
        <input
          type="range"
          min="1"
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          style={{
            position: 'absolute',
            top: '-10px',
            left: 0,
            width: '100%',
            height: '24px',
            opacity: 0,
            cursor: 'pointer'
          }}
        />
        <div style={{
          width: '24px',
          height: '24px',
          background: colorSystem.base.white,
          border: `2px solid ${accentColor}`,
          borderRadius: '50%',
          position: 'absolute',
          top: '-10px',
          left: `calc(${(value / max) * 100}% - 12px)`,
          transition: 'left 0.2s ease'
        }} />
      </div>
    </div>
  );
};

export const MultiSelect = ({ 
  items, 
  selected = [], 
  onChange, 
  columns = 2,
  theme = null
}) => {
  const accentColor = theme ? colorSystem.themes[theme].primary : colorSystem.status.info;
  
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: '8px',
      margin: '16px 0'
    }}>
      {items.map(item => (
        <div
          key={item}
          style={{
            padding: '12px',
            background: selected.includes(item) ? accentColor : colorSystem.gray[200],
            color: selected.includes(item) ? 'white' : colorSystem.base.black,
            borderRadius: `${borderRadius.medium}px`,
            fontSize: '14px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            userSelect: 'none'
          }}
          onClick={() => {
            const newSelected = selected.includes(item)
              ? selected.filter(s => s !== item)
              : [...selected, item];
            onChange(newSelected);
          }}
        >
          {item}
        </div>
      ))}
    </div>
  );
};

export const TextArea = ({
  value,
  onChange,
  placeholder,
  minHeight = 100,
  style = {}
}) => (
  <textarea
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    style={{
      width: '100%',
      minHeight: `${minHeight}px`,
      padding: '16px',
      background: colorSystem.gray[200],
      border: `1px solid ${colorSystem.gray[300]}`,
      borderRadius: `${borderRadius.large}px`,
      fontSize: '16px',
      fontFamily: 'inherit',
      resize: 'vertical',
      outline: 'none',
      transition: 'border-color 0.2s ease',
      ...style
    }}
    onFocus={(e) => e.target.style.borderColor = colorSystem.status.info}
    onBlur={(e) => e.target.style.borderColor = colorSystem.gray[300]}
  />
);

export const Checkbox = ({ 
  checked, 
  onChange, 
  label, 
  subtitle, 
  icon 
}) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    background: colorSystem.base.white,
    border: `1px solid ${colorSystem.gray[300]}`,
    borderRadius: `${borderRadius.medium}px`,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }}
  onClick={() => onChange(!checked)}
  >
    {icon && <div style={{ fontSize: '24px', marginRight: '12px' }}>{icon}</div>}
    <div 
      style={{
        width: '24px',
        height: '24px',
        background: checked ? colorSystem.status.success : 'transparent',
        border: `2px solid ${checked ? colorSystem.status.success : colorSystem.gray[400]}`,
        borderRadius: '6px',
        marginRight: '12px',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {checked && <span style={{ color: 'white', fontSize: '14px' }}>✓</span>}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '16px' }}>{label}</div>
      {subtitle && <div style={{ fontSize: '12px', color: colorSystem.gray[600] }}>{subtitle}</div>}
    </div>
    {checked && <span style={{ color: colorSystem.status.success, fontSize: '20px' }}>✓</span>}
  </div>
);

// ============================================
// COMPOSITE COMPONENTS
// ============================================

export const StatusBar = () => (
  <div style={{
    height: '44px',
    background: colorSystem.base.white,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 24px',
    fontSize: '14px',
    borderBottom: `1px solid ${colorSystem.gray[200]}`
  }}>
    <span style={{ fontWeight: 500 }}>9:41</span>
    <div style={{ display: 'flex', gap: '6px', fontSize: '12px' }}>
      <span>📶</span>
      <span>🔋</span>
    </div>
  </div>
);

export const NavHeader = ({ 
  title, 
  showBack = false, 
  showSkip = false, 
  onBack, 
  onSkip,
  rightElement 
}) => (
  <div style={{
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    background: colorSystem.base.white,
    borderBottom: `1px solid ${colorSystem.gray[200]}`
  }}>
    <div
      style={{
        width: '32px',
        height: '32px',
        borderRadius: `${borderRadius.medium}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: showBack ? 'pointer' : 'default',
        fontSize: '16px'
      }}
      onClick={onBack}
    >
      {showBack && '←'}
    </div>
    <div style={{ 
      fontSize: '18px', 
      fontWeight: 600, 
      flex: 1, 
      textAlign: 'center' 
    }}>
      {title}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {showSkip && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: `${borderRadius.medium}px`,
            cursor: 'pointer',
            fontSize: '14px',
            color: colorSystem.gray[600]
          }}
          onClick={onSkip}
        >
          Skip
        </div>
      )}
      {rightElement || (
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: `${borderRadius.medium}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: colorSystem.gray[200]
          }}
        >
          <BrainIcon size={20} />
        </div>
      )}
    </div>
  </div>
);

export const ProgressBar = ({ current, total }) => (
  <div style={{
    display: 'flex',
    gap: `${spacing.sm}px`,
    padding: `0 ${spacing.lg}px`,
    margin: `${spacing.lg}px 0`
  }}>
    {Array.from({ length: total }, (_, i) => (
      <div
        key={i}
        style={{
          flex: 1,
          height: '4px',
          background: i < current ? colorSystem.status.info : colorSystem.gray[300],
          borderRadius: '2px',
          transition: 'background 0.3s ease'
        }}
      />
    ))}
  </div>
);

export const BottomNav = ({ 
  currentScreen, 
  onNavigate 
}) => {
  const navItems = [
    { key: 'home', label: 'Home', shape: 'triangle', color: colorSystem.navigation.home },
    { key: 'checkins', label: 'Check-ins', shape: 'square', color: colorSystem.navigation.checkins },
    { key: 'exercises', label: 'Exercises', shape: 'star', color: colorSystem.navigation.exercises },
    { key: 'insights', label: 'Insights', shape: 'circle', color: colorSystem.navigation.insights }
  ];
  
  return (
    <div style={{
      height: '84px',
      background: colorSystem.base.white,
      borderTop: `1px solid ${colorSystem.gray[200]}`,
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: '8px 0 24px 0'
    }}>
      {navItems.map(item => (
        <div
          key={item.key}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: `${borderRadius.medium}px`
          }}
          onClick={() => onNavigate(item.key)}
        >
          <NavShape 
            shape={item.shape} 
            color={item.color} 
            active={currentScreen === item.key} 
          />
          <span style={{
            fontSize: '11px',
            color: currentScreen === item.key ? colorSystem.base.black : colorSystem.gray[600],
            fontWeight: currentScreen === item.key ? 600 : 400
          }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export const Card = ({ children, padding = spacing.md, style = {} }) => (
  <div style={{
    background: colorSystem.base.white,
    border: `1px solid ${colorSystem.gray[300]}`,
    borderRadius: `${borderRadius.large}px`,
    padding: `${padding}px`,
    ...style
  }}>
    {children}
  </div>
);

export const InfoBox = ({ children, variant = 'info', icon }) => {
  const bgColor = variant === 'success' ? colorSystem.status.success :
                  variant === 'warning' ? colorSystem.status.warning :
                  variant === 'error' ? colorSystem.status.error :
                  colorSystem.gray[100];
  
  const textColor = variant === 'success' || variant === 'warning' || variant === 'error' 
                    ? 'white' : colorSystem.gray[600];
  
  return (
    <div style={{
      background: bgColor,
      color: textColor,
      padding: `${spacing.md}px`,
      borderRadius: `${borderRadius.large}px`,
      fontSize: '14px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: `${spacing.sm}px`
    }}>
      {icon && <span style={{ fontSize: '16px' }}>{icon}</span>}
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
};

// ============================================
// SCREEN TEMPLATES
// ============================================

export const ScreenContainer = ({ children }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: colorSystem.base.white }}>
    {children}
  </div>
);

export const ScrollContent = ({ children, padding = spacing.lg }) => (
  <div style={{ flex: 1, overflow: 'auto', padding: `${padding}px`, WebkitOverflowScrolling: 'touch' }}>
    {children}
  </div>
);

export const FloatingActionArea = ({ children }) => (
  <div style={{ padding: `${spacing.lg}px`, background: colorSystem.base.white, borderTop: `1px solid ${colorSystem.gray[200]}` }}>
    {children}
  </div>
);

// ============================================
// DATA VISUALIZATION COMPONENTS
// ============================================

export const MoodChart = ({ data = [40, 60, 50, 70, 65, 80, 75], width = '100%', height = 80 }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  return (
    <div style={{ width }}>
      <div style={{
        height: `${height}px`,
        background: colorSystem.gray[200],
        borderRadius: `${borderRadius.medium}px`,
        display: 'flex',
        alignItems: 'flex-end',
        padding: '8px',
        gap: '4px'
      }}>
        {data.map((value, i) => {
          const getBarColor = () => {
            if (value >= 70) return colorSystem.data.positive;
            if (value >= 40) return colorSystem.data.primary;
            return colorSystem.data.negative;
          };

          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '100%', height: `${height - 24}px`, display: 'flex', alignItems: 'flex-end' }}>
                <div style={{
                  width: '100%',
                  height: `${value}%`,
                  background: getBarColor(),
                  borderRadius: '2px',
                  transition: 'height 0.3s ease',
                  opacity: 0.9
                }} />
              </div>
              <span style={{ fontSize: '8px', color: colorSystem.gray[600], textAlign: 'center' }}>
                {days[i]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const TrendLine = ({ data = [5, 6, 5, 7, 6, 8, 7], width = '100%', height = 60, showDots = true }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <div style={{ width, height, position: 'relative' }}>
      <svg width="100%" height={height} viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
        {[0, 25, 50, 75, 100].map(y => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke={colorSystem.gray[300]} strokeWidth="0.5" opacity="0.3" />
        ))}
        <polyline points={points} fill="none" stroke={colorSystem.data.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {showDots && data.map((value, i) => {
          const x = (i / (data.length - 1)) * 100;
          const y = 100 - ((value - min) / range) * 100;
          return (
            <circle key={i} cx={x} cy={y} r="3" fill={colorSystem.base.white} stroke={colorSystem.data.primary} strokeWidth="2" />
          );
        })}
      </svg>
    </div>
  );
};

export const InsightCard = ({ title, value, change, trend = 'neutral', icon, children }) => {
  const trendColor = trend === 'up' ? colorSystem.data.positive : trend === 'down' ? colorSystem.data.negative : colorSystem.gray[600];
  
  return (
    <Card style={{ marginBottom: spacing.md }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm }}>
        <div>
          {icon && <span style={{ fontSize: '20px', marginRight: '8px' }}>{icon}</span>}
          <h3 style={{ fontSize: '14px', color: colorSystem.gray[600], fontWeight: 400, margin: 0 }}>{title}</h3>
        </div>
        {change && (
          <span style={{ fontSize: '12px', color: trendColor, fontWeight: 500 }}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {change}
          </span>
        )}
      </div>
      {value && <div style={{ fontSize: '28px', fontWeight: 600, marginBottom: spacing.sm }}>{value}</div>}
      {children}
    </Card>
  );
};

export const ProgressRing = ({ progress = 75, size = 60, strokeWidth = 4, color = colorSystem.status.info }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={colorSystem.gray[300]} strokeWidth={strokeWidth} />
        <circle 
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '14px', fontWeight: 600
      }}>
        {progress}%
      </div>
    </div>
  );
};

export const StatCard = ({ label, value, unit, color = colorSystem.status.info, type = 'system' }) => {
  const getColor = () => {
    switch (type) {
      case 'morning': return colorSystem.themes.morning.primary;
      case 'daily': return colorSystem.themes.daily.primary;
      case 'evening': return colorSystem.themes.evening.primary;
      default: return color === colorSystem.status.info ? colorSystem.base.midnightBlue : color;
    }
  };

  return (
    <div style={{ padding: `${spacing.md}px`, background: colorSystem.gray[200], borderRadius: `${borderRadius.large}px`, textAlign: 'center' }}>
      <div style={{ fontSize: '12px', color: colorSystem.gray[600], marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: 600, color: getColor() }}>
        {value}{unit && <span style={{ fontSize: '14px', fontWeight: 400 }}>{unit}</span>}
      </div>
    </div>
  );
};

export const HeatMap = ({ data = [], weeks = 12, cellSize = 12, gap = 2 }) => {
  const getDemoIntensity = () => Math.random();
  
  return (
    <div style={{ display: 'inline-block', padding: `${spacing.sm}px` }}>
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: `repeat(${weeks}, ${cellSize}px)`,
        gridTemplateRows: `repeat(7, ${cellSize}px)`,
        gap: `${gap}px`
      }}>
        {Array(weeks * 7).fill(null).map((_, i) => {
          const intensity = getDemoIntensity();
          const getColor = () => {
            if (intensity > 0.75) return colorSystem.data.heatMap.high;
            if (intensity > 0.5) return colorSystem.data.heatMap.medium;
            if (intensity > 0.25) return colorSystem.data.heatMap.low;
            return colorSystem.data.heatMap.minimal;
          };
          
          return (
            <div key={i} style={{
              width: cellSize, height: cellSize, background: getColor(),
              borderRadius: '2px', transition: 'all 0.2s ease', cursor: 'pointer'
            }} title={`Day ${i + 1}`} />
          );
        })}
      </div>
      
      <div style={{ display: 'flex', gap: '4px', marginTop: '8px', fontSize: '10px', color: colorSystem.gray[600], alignItems: 'center' }}>
        <span>Less</span>
        {[colorSystem.data.heatMap.minimal, colorSystem.data.heatMap.low, colorSystem.data.heatMap.medium, colorSystem.data.heatMap.high].map((color, i) => (
          <div key={i} style={{ width: cellSize, height: cellSize, background: color, borderRadius: '2px' }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
};

// ============================================
// ANIMATION HELPERS
// ============================================

export const animations = {
  fadeIn: { animation: 'fadeIn 0.3s ease-in-out' },
  slideUp: { animation: 'slideUp 0.3s ease-out' },
  pulse: { animation: 'pulse 2s infinite' }
};

// ============================================
// CLAUDE QUICK REFERENCE (OPTIMIZED)
// ============================================

export const CLAUDE_QUICK_REF = {
  // DIRECT COLOR ACCESS
  colors: {
    morning: colorSystem.themes.morning,
    daily: colorSystem.themes.daily,
    evening: colorSystem.themes.evening,
    system: colorSystem.base.midnightBlue,
    data: colorSystem.data,
    navigation: colorSystem.navigation
  },
  
  // COMPONENT SHORTCUTS
  themedButton: (theme, variant = 'primary') => ({ theme, variant }),
  themedSlider: (theme) => ({ theme }),
  themedMultiSelect: (theme) => ({ theme }),
  themedStatCard: (type) => ({ type }),
  
  // COPY-PASTE READY
  exampleUsage: {
    morningButton: `<Button theme="morning">Continue Morning Check-in</Button>`,
    dailyButton: `<Button theme="daily" variant="success">Complete Tasks</Button>`,
    eveningSlider: `<Slider theme="evening" label="Mood" value={7} onChange={setValue} />`,
    systemStatCard: `<StatCard label="Streak" value="14" unit=" days" type="system" />`
  }
};

// ============================================
// VERSION & EXPORTS
// ============================================

export const LIBRARY_VERSION = '1.1.0';
export const LAST_UPDATED = '2025-08-30';

// All component exports for Claude
export const ALL_COMPONENTS = {
  // Core
  BrainIcon, NavShape, ColorPalette,
  // Base
  Button, Slider, MultiSelect, TextArea, Checkbox,
  // Composite  
  StatusBar, NavHeader, ProgressBar, BottomNav, Card, InfoBox,
  // Templates
  ScreenContainer, ScrollContent, FloatingActionArea,
  // Data Viz
  MoodChart, TrendLine, InsightCard, ProgressRing, StatCard, HeatMap
};

// ============================================
// DEMO (COMPREHENSIVE PREVIEW)
// ============================================

const DesignLibraryDemo = () => {
  const [sliderValue, setSliderValue] = React.useState(7);
  const [selectedEmotions, setSelectedEmotions] = React.useState(['Happy', 'Calm']);
  const [checked, setChecked] = React.useState(true);

  return (
    <div style={{
      maxWidth: '800px', margin: '0 auto', padding: '20px',
      background: colorSystem.gray[100], minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif'
    }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ marginBottom: '8px' }}>FullMind Design Library v{LIBRARY_VERSION}</h1>
        <p style={{ fontSize: '14px', color: colorSystem.gray[600], marginBottom: '16px' }}>
          Complete design system • Claude-optimized • {LAST_UPDATED}
        </p>
      </div>
      
      {/* Logo */}
      <section style={{ marginBottom: '40px' }}>
        <h2>Logo (60% Fill)</h2>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <BrainIcon size={32} />
          <BrainIcon size={48} />
          <BrainIcon size={64} />
        </div>
      </section>
      
      {/* Navigation System */}
      <section style={{ marginBottom: '40px' }}>
        <h2>Navigation Shape System</h2>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <NavShape shape="triangle" color={colorSystem.navigation.home} active />
            <div style={{ fontSize: '12px', marginTop: '4px' }}>Home</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <NavShape shape="square" color={colorSystem.navigation.checkins} active />
            <div style={{ fontSize: '12px', marginTop: '4px' }}>Check-ins</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <NavShape shape="star" color={colorSystem.navigation.exercises} active />
            <div style={{ fontSize: '12px', marginTop: '4px' }}>Exercises</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <NavShape shape="circle" color={colorSystem.navigation.insights} active />
            <div style={{ fontSize: '12px', marginTop: '4px' }}>Insights</div>
          </div>
        </div>
        <div style={{ fontSize: '14px', color: colorSystem.gray[600] }}>
          Complete bottom navigation system (shown active to display colors)
        </div>
      </section>

      {/* Enhanced Theme System */}
      <section style={{ marginBottom: '40px' }}>
        <h2>Enhanced Theme System</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          <div style={{ background: colorSystem.themes.morning.background, padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ color: colorSystem.themes.morning.primary, marginBottom: '12px' }}>Morning Theme</h3>
            <Button theme="morning" fullWidth={false} style={{ marginRight: '8px', marginBottom: '8px' }}>Continue</Button>
            <Button theme="morning" variant="success" fullWidth={false} style={{ marginBottom: '8px' }}>Complete</Button>
          </div>
          <div style={{ background: colorSystem.themes.daily.background, padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ color: colorSystem.themes.daily.primary, marginBottom: '12px' }}>Daily Theme</h3>
            <Button theme="daily" fullWidth={false} style={{ marginRight: '8px', marginBottom: '8px' }}>Continue</Button>
            <Button theme="daily" variant="success" fullWidth={false} style={{ marginBottom: '8px' }}>Complete</Button>
          </div>
          <div style={{ background: colorSystem.themes.evening.background, padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ color: colorSystem.themes.evening.primary, marginBottom: '12px' }}>Evening Theme</h3>
            <Button theme="evening" fullWidth={false} style={{ marginRight: '8px', marginBottom: '8px' }}>Continue</Button>
            <Button theme="evening" variant="success" fullWidth={false} style={{ marginBottom: '8px' }}>Complete</Button>
          </div>
        </div>
      </section>

      {/* All Components Sample */}
      <section style={{ marginBottom: '40px' }}>
        <h2>Component Samples</h2>
        
        <div style={{ marginBottom: '24px' }}>
          <h3>Form Components</h3>
          <Slider label="Anxiety Level" value={sliderValue} onChange={setSliderValue} showEmoji theme="morning" />
          <MultiSelect items={['Happy', 'Calm', 'Anxious', 'Excited']} selected={selectedEmotions} onChange={setSelectedEmotions} theme="evening" />
          <Checkbox checked={checked} onChange={setChecked} label="Meditated" subtitle="Even 1 minute counts" icon="🧘" />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3>Info Components</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <InfoBox icon="💡">This is helpful information</InfoBox>
            <InfoBox variant="success" icon="✅">Success message goes here</InfoBox>
            <InfoBox variant="warning" icon="⚠️">Warning message for caution</InfoBox>
            <InfoBox variant="error" icon="❌">Error message for problems</InfoBox>
            <InfoBox variant="info" icon="ℹ️">Additional information context</InfoBox>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3>Progress Components</h3>
          <ProgressBar current={3} total={6} />
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
            <ProgressRing progress={75} />
            <ProgressRing progress={90} color={colorSystem.status.success} />
          </div>
        </div>
      </section>

      {/* Data Visualization */}
      <section style={{ marginBottom: '40px' }}>
        <h2>Data Visualization</h2>
        
        <div style={{ marginBottom: '24px' }}>
          <h3>Mood Chart</h3>
          <MoodChart data={[45, 60, 55, 80, 75, 85, 78]} />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3>Themed Stat Cards</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
            <StatCard label="Morning Check-ins" value="28" unit="/30" type="morning" />
            <StatCard label="Tasks Completed" value="65" unit="%" type="daily" />
            <StatCard label="Evening Reflections" value="22" unit="/30" type="evening" />
            <StatCard label="Overall Streak" value="14" unit=" days" type="system" />
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3>Heat Map</h3>
          <HeatMap weeks={10} />
        </div>
      </section>

      {/* Color Palette */}
      <section style={{ marginBottom: '40px' }}>
        <ColorPalette />
      </section>

      {/* Claude Reference */}
      <section>
        <h2>Claude Quick Reference</h2>
        <div style={{ background: colorSystem.gray[200], padding: '16px', borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace' }}>
          <p><strong>Direct Access:</strong></p>
          <p>colorSystem.themes.morning.primary → {colorSystem.themes.morning.primary}</p>
          <p>colorSystem.themes.daily.success → {colorSystem.themes.daily.success}</p>
          <p>colorSystem.themes.evening.primary → {colorSystem.themes.evening.primary}</p>
          <p>colorSystem.themes.evening.success → {colorSystem.themes.evening.success}</p>
          <br />
          <p><strong>Component Usage:</strong></p>
          <p>&lt;Button theme="morning"&gt; | &lt;Slider theme="evening"&gt; | &lt;StatCard type="daily"&gt;</p>
        </div>
      </section>
    </div>
  );
};

export default DesignLibraryDemo;