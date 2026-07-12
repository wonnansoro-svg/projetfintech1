import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

async function uploadFile(path: string, file: File | Blob): Promise<string> {
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

export function uploadKycPhoto(uid: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  return uploadFile(`kyc-ids/${uid}/photo.${ext}`, file);
}

export function uploadLossPhoto(uid: string, file: File, index: number): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  return uploadFile(`losses/${uid}/${Date.now()}-${index}.${ext}`, file);
}
