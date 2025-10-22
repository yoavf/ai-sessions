import { posix } from "node:path";

/**
 * Check if a path is absolute (supports both Unix and Windows formats)
 */
function isAbsolutePath(path: string): boolean {
  // Unix absolute path starts with /
  if (path.startsWith("/")) {
    return true;
  }

  // Windows absolute path starts with drive letter (e.g., C:\, D:\)
  if (/^[A-Za-z]:[/\\]/.test(path)) {
    return true;
  }

  return false;
}

/**
 * Normalize path to use forward slashes (works on both Unix and Windows)
 */
function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

/**
 * Converts an absolute file path to a path relative to the project's cwd
 * Handles both Unix-style and Windows-style paths by normalizing to forward slashes
 *
 * @param absolutePath - The absolute file path to convert
 * @param cwd - The current working directory from the transcript
 * @returns The relative path if possible, otherwise the original path
 *
 * @example
 * // Unix paths
 * makeRelativePath('/Users/dev/myproject/src/index.ts', '/Users/dev/myproject')
 * // => 'src/index.ts'
 *
 * // Windows paths
 * makeRelativePath('C:\\Users\\dev\\myproject\\src\\index.ts', 'C:\\Users\\dev\\myproject')
 * // => 'src/index.ts'
 *
 * // Outside project
 * makeRelativePath('/etc/hosts', '/Users/dev/myproject')
 * // => '/etc/hosts' (outside project, keep absolute)
 *
 * // Already relative
 * makeRelativePath('src/index.ts', '/Users/dev/myproject')
 * // => 'src/index.ts' (already relative)
 */
export function makeRelativePath(absolutePath: string, cwd?: string): string {
  // If no cwd available, return path as-is
  if (!cwd) {
    return absolutePath;
  }

  // If path is already relative, return as-is
  if (!isAbsolutePath(absolutePath)) {
    return absolutePath;
  }

  try {
    // Normalize both paths to use forward slashes
    const normalizedPath = normalizePath(absolutePath);
    const normalizedCwd = normalizePath(cwd);

    // Use posix.relative() which works with forward slash paths
    const relativePath = posix.relative(normalizedCwd, normalizedPath);

    // If the relative path starts with .. or is empty, handle specially
    if (relativePath.startsWith("..")) {
      // File is outside the project directory, keep absolute
      return absolutePath;
    }

    if (relativePath === "") {
      // Path equals cwd exactly, keep absolute for clarity
      return absolutePath;
    }

    return relativePath;
  } catch {
    // If path.relative() fails for any reason, return the original path
    return absolutePath;
  }
}
