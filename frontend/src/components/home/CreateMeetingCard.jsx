import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { MdAdd } from "react-icons/md";
import { createMeeting } from "@/api/meetings";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { getErrorMessage } from "@/lib/errors";
import { createMeetingSchema } from "@/validations/meetingSchemas";

export default function CreateMeetingCard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(createMeetingSchema),
    defaultValues: { title: "", scheduledAt: "" },
  });

  const create = useMutation({
    mutationFn: createMeeting,
    onSuccess: (meeting) => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      reset();
      if (meeting.status === "SCHEDULED") {
        toast.success(`Meeting scheduled. Code: ${meeting.meetingCode}`);
      } else {
        toast.success("Meeting created");
        navigate(`/meeting/${meeting.id}`, { state: { title: meeting.title, code: meeting.meetingCode } });
      }
    },
    onError: (error) => toast.error(getErrorMessage(error, "Could not create the meeting")),
  });

  const onSubmit = ({ title, scheduledAt }) => {
    create.mutate({ title, ...(scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}) });
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <h2 className="flex items-center gap-2 font-medium text-white"><MdAdd size={20} className="text-blue-400" /> New meeting</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3" noValidate>
        <Input label="Title" placeholder="Weekly sync" error={errors.title?.message} {...register("title")} />
        <Input
          label="Schedule for later (optional)"
          type="datetime-local"
          hint="Leave empty to start right now"
          error={errors.scheduledAt?.message}
          {...register("scheduledAt")}
        />
        <Button type="submit" loading={create.isPending} className="w-full">Create meeting</Button>
      </form>
    </section>
  );
}
