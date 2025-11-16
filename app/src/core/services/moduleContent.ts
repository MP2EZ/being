/**
 * Module Content Loader
 * FEAT-49: Educational Modules
 *
 * Loads and caches JSON module content files.
 * Type-safe content access with error handling.
 */

import type { ModuleId, ModuleContent } from '@/types/education';

// Content cache (in-memory, persists for app session)
const contentCache: Partial<Record<ModuleId, ModuleContent>> = {};

/**
 * Load module content from JSON file
 * Returns cached version if already loaded (performance optimization)
 */
export async function loadModuleContent(
  moduleId: ModuleId
): Promise<ModuleContent> {
  // Check cache first
  if (contentCache[moduleId]) {
    return contentCache[moduleId]!;
  }

  // Load from assets
  try {
    const content = await loadModuleFromAssets(moduleId);

    // Validate content structure
    validateModuleContent(content);

    // Cache for future use
    contentCache[moduleId] = content;

    return content;
  } catch (error) {
    console.error(`[ModuleContent] Failed to load ${moduleId}:`, error);
    throw new Error(`Failed to load module content: ${moduleId}`);
  }
}

/**
 * Load module JSON from assets directory
 */
async function loadModuleFromAssets(
  moduleId: ModuleId
): Promise<ModuleContent> {
  // Dynamically require the correct JSON file
  let content: ModuleContent;

  switch (moduleId) {
    case 'aware-presence':
      content = require('../../../assets/modules/module-1-aware-presence.json');
      break;
    case 'radical-acceptance':
      content = require('../../../assets/modules/module-2-radical-acceptance.json');
      break;
    case 'sphere-sovereignty':
      content = require('../../../assets/modules/module-3-sphere-sovereignty.json');
      break;
    case 'virtuous-response':
      content = require('../../../assets/modules/module-4-virtuous-response.json');
      break;
    case 'interconnected-living':
      content = require('../../../assets/modules/module-5-interconnected-living.json');
      break;
    default:
      throw new Error(`Unknown module ID: ${moduleId}`);
  }

  return content;
}

/**
 * Validate module content structure
 * Ensures required fields are present
 */
function validateModuleContent(content: any): asserts content is ModuleContent {
  const requiredFields = [
    'id',
    'number',
    'title',
    'tag',
    'description',
    'estimatedMinutes',
    'classicalQuote',
    'whatItIs',
    'whyItMatters',
    'practices',
    'commonObstacles',
    'reflectionPrompt',
    'developmentalStages',
  ];

  for (const field of requiredFields) {
    if (!(field in content)) {
      throw new Error(`Module content missing required field: ${field}`);
    }
  }

  // Validate nested structures
  if (!content.classicalQuote.text || !content.classicalQuote.author) {
    throw new Error('Invalid classical quote structure');
  }

  if (!content.whatItIs.summary || !Array.isArray(content.whatItIs.concepts)) {
    throw new Error('Invalid whatItIs structure');
  }

  if (!Array.isArray(content.practices) || content.practices.length === 0) {
    throw new Error('Module must have at least one practice');
  }
}

/**
 * Preload all module content
 * Call during app initialization for optimal performance
 */
export async function preloadAllModules(): Promise<void> {
  const moduleIds: ModuleId[] = [
    'aware-presence',
    'radical-acceptance',
    'sphere-sovereignty',
    'virtuous-response',
    'interconnected-living',
  ];

  await Promise.all(moduleIds.map((id) => loadModuleContent(id)));
}

/**
 * Clear content cache
 * Useful for testing or memory management
 */
export function clearContentCache(): void {
  Object.keys(contentCache).forEach((key) => {
    delete contentCache[key as ModuleId];
  });
}

/**
 * Get all module IDs
 */
export function getAllModuleIds(): ModuleId[] {
  return [
    'aware-presence',
    'radical-acceptance',
    'sphere-sovereignty',
    'virtuous-response',
    'interconnected-living',
  ];
}
