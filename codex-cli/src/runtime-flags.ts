export function shouldConfirmOutsideGitRepo(options: {
  inGitRepo: boolean;
  accepted: boolean;
  skipGitRepoCheck: boolean;
}): boolean {
  return !options.inGitRepo && !options.accepted && !options.skipGitRepoCheck;
}

export function shouldPersistRollout(ephemeral: boolean): boolean {
  return !ephemeral;
}
