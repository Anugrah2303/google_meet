import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { MdKeyboard } from "react-icons/md";
import { getMeetingByCode } from "@/api/meetings";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { getErrorMessage } from "@/lib/errors";
import { joinCodeSchema } from "@/validations/meetingSchemas";

export default function JoinMeetingForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(joinCodeSchema),
    defaultValues: { code: "" },
  });

  const onSubmit = async ({ code }) => {
    setLoading(true);
    try {
      const { meeting } = await getMeetingByCode(code);
      if (meeting.status === "ENDED") {
        toast.error("This meeting has already ended");
        return;
      }
      navigate(`/meeting/${meeting.id}`, { state: { title: meeting.title, code: meeting.meetingCode } });
    } catch (error) {
      toast.error(error.response?.status === 404 ? "No meeting found with that code" : getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // register() gives us onChange; we wrap it to force lower-case while typing
  const codeField = register("code");

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <h2 className="flex items-center gap-2 font-medium text-white"><MdKeyboard size={20} className="text-blue-400" /> Join with a code</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3" noValidate>
        <Input
          label="Meeting code"
          placeholder="abc-defg-hij"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          error={errors.code?.message}
          {...codeField}
          onChange={(e) => {
            setValue("code", e.target.value.toLowerCase(), { shouldValidate: Boolean(errors.code) });
          }}
        />
        <Button type="submit" variant="secondary" loading={loading} className="w-full">Join</Button>
      </form>
    </section>
  );
}
