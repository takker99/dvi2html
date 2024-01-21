export const toDataURL = (blob: Blob) => {
  const fileReader = new FileReader();
  const promise = new Promise<string>((resolve) =>
    fileReader.onload = () => resolve(fileReader.result as string)
  );
  fileReader.readAsDataURL(blob);
  return promise;
};
