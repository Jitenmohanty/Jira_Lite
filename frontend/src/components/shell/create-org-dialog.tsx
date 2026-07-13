'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateOrg } from '@/hooks/use-orgs';
import { useUIStore } from '@/stores/ui-store';
import { ApiError } from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, Label } from '@/components/ui/field';

const schema = z.object({ name: z.string().min(1, 'Name is required') });
type FormValues = z.infer<typeof schema>;

export function CreateOrgDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateOrg();
  const setActiveOrgId = useUIStore((s) => s.setActiveOrgId);
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
      const org = await create.mutateAsync({ name: values.name });
      setActiveOrgId(org.id);
      close();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong');
    }
  });

  return (
    <Modal open={open} onClose={close} title="New organization">
      <form onSubmit={onSubmit} noValidate>
        <Field>
          <Label htmlFor="o-name">Name</Label>
          <Input id="o-name" placeholder="Acme Inc." {...register('name')} />
          <FieldError>{errors.name?.message}</FieldError>
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
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}
