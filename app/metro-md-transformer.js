/**
 * Metro Transformer for Markdown Files
 * Converts .md files to JavaScript modules that export raw text
 *
 * Used for bundling legal documents (privacy policy, ToS, etc.) directly into the app
 * for offline availability.
 */

const upstreamTransformer = require('metro-react-native-babel-transformer');

module.exports.transform = async ({ src, filename, options }) => {
  // Only transform .md files
  if (filename.endsWith('.md')) {
    // Escape backticks, backslashes, and template literal syntax
    const escapedContent = src
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\${/g, '\\${');

    // Convert to a module that exports the raw markdown string
    const transformedSrc = `export default \`${escapedContent}\`;`;

    return upstreamTransformer.transform({
      src: transformedSrc,
      filename,
      options,
    });
  }

  // Pass through all other files to the default transformer
  return upstreamTransformer.transform({ src, filename, options });
};
