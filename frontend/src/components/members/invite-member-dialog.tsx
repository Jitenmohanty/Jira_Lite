'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAddMember } from '@/hooks/use-orgs';
import { ApiError } from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Field, FieldError, Label } from '@/components/ui/field';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  role: z.enum(['admin', 'member']),
});
type FormValues = z.infer<typeof schema>;

export function InviteMemberDialog({
  orgId,
  open,
  onClose,
}: {
  orgId: string;
  open: boolean;
  onClose: () => void;
}) {
  const add = useAddMember(orgId);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { role: 'member' } });

  const close = () => {
    reset();
    setFormError(null);
    onClose();
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await add.mutateAsync(values);
      close();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong');
    }
  });

  return (
    <Modal open={open} onClose={close} title="Add member">
      <form onSubmit={onSubmit} noValidate>
        <p className="mb-4 text-sm text-muted">
          Add an existing Tracer user to this organization by their email.
        </p>
        <Field>
          <Label htmlFor="m-email">Email</Label>
          <Input id="m-email" type="email" placeholder="teammate@company.com" {...register('email')} />
          <FieldError>{errors.email?.message}</FieldError>
        </Field>
        <Field>
          <Label htmlFor="m-role">Role</Label>
          <Select id="m-role" {...register('role')}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </Select>
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
          <Button type="submit" loading={add.isPending}>
            Add member
          </Button>
        </div>
      </form>
    </Modal>
  );
}
