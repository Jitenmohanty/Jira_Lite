'use client';

import { useState } from 'react';
import { UserPlus, Users } from 'lucide-react';
import { useActiveOrg } from '@/hooks/use-active-org';
import { useMe } from '@/hooks/use-auth';
import { useChangeRole, useMembers } from '@/hooks/use-orgs';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/types';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { InviteMemberDialog } from '@/components/members/invite-member-dialog';

const ROLE_STYLE: Record<Role, string> = {
  owner: 'bg-accent/15 text-accent',
  admin: 'bg-sky-500/15 text-sky-300',
  member: 'bg-surface-hover text-muted',
};

export default function MembersPage() {
  const { org } = useActiveOrg();
  const { data: me } = useMe();
  const { data: members, isLoading } = useMembers(org?.id);
  const changeRole = useChangeRole(org?.id ?? '');
  const [invite, setInvite] = useState(false);

  const myRole = org?.role;
  const canInvite = myRole === 'owner' || myRole === 'admin'; // admin+
  const canChangeRoles = myRole === 'owner'; // owner only

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Members</h1>
          <p className="mt-0.5 text-sm text-muted">People in {org?.name ?? 'this organization'}.</p>
        </div>
        {/* Invite is gated to admins+; enforced on the backend too. */}
        {canInvite && (
          <Button size="sm" onClick={() => setInvite(true)}>
            <UserPlus size={15} />
            Add member
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {!isLoading && (!members || members.length === 0) && (
        <EmptyState icon={<Users size={20} />} title="No members" />
      )}

      {!isLoading && members && members.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <tbody>
              {members.map((m) => (
                <tr
                  key={m.userId}
                  className="border-b border-border-subtle last:border-0 hover:bg-surface-hover/50"
                >
                  <td className="py-3 pl-4 pr-2">
                    <div className="flex items-center gap-3">
                      <Avatar name={m.name} id={m.userId} src={m.avatarUrl} size="md" />
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-medium">
                          {m.name}
                          {m.userId === me?.id && (
                            <span className="text-xs font-normal text-faint">(you)</span>
                          )}
                        </p>
                        <p className="truncate text-xs text-muted">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pl-2 pr-4 text-right">
                    {canChangeRoles ? (
                      <Select
                        className="ml-auto h-8 w-32"
                        value={m.role}
                        disabled={changeRole.isPending}
                        onChange={(e) =>
                          changeRole.mutate({ userId: m.userId, role: e.target.value as Role })
                        }
                      >
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                      </Select>
                    ) : (
                      <span
                        className={cn(
                          'inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize',
                          ROLE_STYLE[m.role],
                        )}
                      >
                        {m.role}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {changeRole.isError && (
        <p className="mt-3 text-xs text-danger">
          {changeRole.error instanceof Error ? changeRole.error.message : 'Could not change role'}
        </p>
      )}

      {org && <InviteMemberDialog orgId={org.id} open={invite} onClose={() => setInvite(false)} />}
    </div>
  );
}
