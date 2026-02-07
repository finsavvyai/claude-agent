module.exports = {
  // Basic formatting
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  quoteProps: 'as-needed',
  jsxSingleQuote: true,

  // Spacing and layout
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  bracketSameLine: false,

  // Arrow functions
  arrowParens: 'avoid',

  // End of line
  endOfLine: 'lf',

  // HTML/CSS/JSX specific
  htmlWhitespaceSensitivity: 'css',
  vueIndentScriptAndStyle: false,

  // Prose wrapping
  proseWrap: 'preserve',

  // Embedded language formatting
  embeddedLanguageFormatting: 'auto',

  // Plugin specific configurations
  plugins: [
    'prettier-plugin-tailwindcss',
    '@trivago/prettier-plugin-sort-imports',
  ],

  // Import sorting configuration
  importOrder: [
    // Node.js built-in modules
    '^(assert|buffer|child_process|cluster|console|constants|crypto|dgram|dns|domain|events|fs|http|https|module|net|os|path|punycode|querystring|readline|repl|stream|string_decoder|sys|timers|tls|tty|url|util|v8|vm|zlib)(/.*)?$',

    // External dependencies
    '^@?[\w-]+',

    // Internal packages (workspace packages)
    '^@claude-agent/(.*)$',
    '^@luna-agents/(.*)$',

    // Relative imports
    '^\\./(.*)$',
    '^\\../(.*)$',

    // Type imports
    '^(.*\\.type)$',

    // Style imports
    '^(.*\\.css)$',
    '^(.*\\.scss)$',
    '^(.*\\.less)$',
  ],

  importOrderSeparation: true,
  importOrderSortSpecifiers: true,

  // Tailwind CSS classes sorting
  tailwindConfig: './tailwind.config.js',

  // Override rules for specific file types
  overrides: [
    {
      files: '*.md',
      options: {
        printWidth: 100,
        proseWrap: 'always',
      },
    },
    {
      files: '*.json',
      options: {
        printWidth: 100,
        tabWidth: 2,
      },
    },
    {
      files: '*.yml',
      options: {
        tabWidth: 2,
        singleQuote: false,
      },
    },
    {
      files: '*.yaml',
      options: {
        tabWidth: 2,
        singleQuote: false,
      },
    },
    {
      files: '*.tsx',
      options: {
        jsxSingleQuote: true,
        jsxBracketSameLine: false,
      },
    },
    {
      files: '*.html',
      options: {
        printWidth: 120,
        htmlWhitespaceSensitivity: 'ignore',
      },
    },
    {
      files: '*.css',
      options: {
        singleQuote: false,
      },
    },
    {
      files: '*.scss',
      options: {
        singleQuote: false,
      },
    },
  ],
};
