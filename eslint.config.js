// import js from '@eslint/js'
// import globals from 'globals'
// import reactHooks from 'eslint-plugin-react-hooks'
// import reactRefresh from 'eslint-plugin-react-refresh'
// import { defineConfig, globalIgnores } from 'eslint/config'

// export default defineConfig([
//   globalIgnores(['dist']),
//   {
//     files: ['**/*.{js,jsx}'],
//     extends: [
//       js.configs.recommended,
//       reactHooks.configs.flat.recommended,
//       reactRefresh.configs.vite,
//     ],
//     languageOptions: {
//       globals: globals.browser,
//       parserOptions: { ecmaFeatures: { jsx: true } },
//     },
//   },
// ])


import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    // 1. We keep your existing configs
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    // 2. ADD THIS RULES SECTION
    rules: {
      // This tells ESLint: "Don't worry if I don't use the word 'React' after importing it"
      'no-unused-vars': ['warn', { 'varsIgnorePattern': 'React' }],
      
      // If you want to stop importing React entirely (Modern React), 
      // you can also add this if you have the react plugin:
      // 'react/react-in-jsx-scope': 'off',
    },
  },
])