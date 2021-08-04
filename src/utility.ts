declare global {
  var timeStamp: string;
}
export const existsSync = (filename: string): boolean => {
  try {
    Deno.statSync(filename);
    // successful, file or directory must exist
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      // file or directory does not exist
      return false;
    } else {
      // unexpected error, maybe permissions, pass it along
      throw error;
    }
  }
};

export const generateTimestamp = (): string => {
  const ts = (new Date()).toJSON();
  globalThis.timeStamp = ts;
  return ts;
};
