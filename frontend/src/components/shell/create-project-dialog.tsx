'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateProject } from '@/hooks/use-projects';
import { ApiError } from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Field, FieldError, Label } from '@/components/ui/field';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  key: z
    .string()
    .regex(/^[A-Za-z0-9]*$/, 'Letters and numbers only')
    .max(10)
    .optional(),
  description: z.string().max(2000).optional(),
});
type FormValues = z.infer<typeof schema>;

export function CreateProjectDialog({
  orgId,
  open,
  onClose,
}: {
  orgId: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const create = useCreateProject(orgId);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const close = () => {
    reset();
    setFormError(null);
    onClose();
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const project = await create.mutateAsync({
        name: values.name,
        key: values.key ? values.key.toUpperCase() : undefined,
        description: values.description || undefined,
      });
      close();
      router.push(`/app/projects/${project.id}`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong');
    }
  });

  return (
    <Modal open={open} onClose={close} title="New project">
      <form onSubmit={onSubmit} noValidate>
        <Field>
          <Label htmlFor="p-name">Name</Label>
          <Input id="p-name" placeholder="Marketing Site" {...register('name')} />
          <FieldError>{errors.name?.message}</FieldError>
        </Field>
        <Field>
          <Label htmlFor="p-key">Key (optional)</Label>
          <Input id="p-key" placeholder="Auto-generated, e.g. MKT" {...register('key')} />
          <FieldError>{errors.key?.message}</FieldError>
        </Field>
        <Field>
          <Label htmlFor="p-desc">Description (optional)</Label>
          <Textarea id="p-desc" {...register('description')} />
        </Field>

        {formError && (
          <p className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {formError}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending}>
            Create project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
