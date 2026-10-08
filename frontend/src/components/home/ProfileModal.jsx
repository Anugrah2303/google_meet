import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateAvatar, updateProfile } from "@/api/users";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { AVATAR_TYPES, MAX_AVATAR_SIZE } from "@/lib/constants";
import { getErrorMessage } from "@/lib/errors";
import { profileSchema } from "@/validations/authSchemas";
import { useAuthStore } from "@/stores/authStore";

export default function ProfileModal({ open, onClose }) {
  const user = useAuthStore((s) => s.user);
  const fileInput = useRef(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || "" },
  });

  // Refill the form with the current name every time the modal opens
  useEffect(() => {
    if (open) reset({ name: user?.name || "" });
  }, [open, user?.name, reset]);

  const saveName = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updated) => {
      useAuthStore.getState().setUser(updated);
      toast.success("Profile updated");
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const saveAvatar = useMutation({
    mutationFn: updateAvatar,
    onSuccess: (updated) => {
      useAuthStore.getState().setUser(updated);
      toast.success("Photo updated");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow choosing the same file again
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) return toast.error("Choose a JPG, PNG or WebP image");
    if (file.size > MAX_AVATAR_SIZE) return toast.error("The image must be smaller than 2 MB");
    saveAvatar.mutate(file);
  };

  return (
    <Modal open={open} onClose={onClose} title="Your profile">
      <div className="mb-5 flex items-center gap-4">
        <Avatar name={user?.name} src={user?.avatar} className="h-16 w-16 text-xl" />
        <div>
          <input ref={fileInput} type="file" accept={AVATAR_TYPES.join(",")} onChange={handleFile} className="hidden" />
          <Button variant="secondary" size="sm" loading={saveAvatar.isPending} onClick={() => fileInput.current?.click()}>
            Change photo
          </Button>
          <p className="mt-1 text-xs text-slate-500">JPG, PNG or WebP, up to 2 MB</p>
        </div>
      </div>
      <form onSubmit={handleSubmit((values) => saveName.mutate(values))} className="space-y-4" noValidate>
        <Input label="Name" error={errors.name?.message} {...register("name")} />
        <p className="text-xs text-slate-500">{user?.email}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saveName.isPending}>Save changes</Button>
        </div>
      </form>
    </Modal>
  );
}
