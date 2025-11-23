---
description: Backup the project by committing changes to Git
---

This workflow will help you save your current changes to the local Git repository. This acts as a "save point" that you can revert to later if needed.

1.  **Check Status**: See what files have changed.
    ```powershell
    git status
    ```

2.  **Stage Changes**: Prepare all modified files for backup.
    ```powershell
    git add .
    ```

3.  **Commit Backup**: Save the changes with a timestamped message.
    ```powershell
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    git commit -m "Backup: $timestamp"
    ```

4.  **Verify**: Confirm the backup was successful.
    ```powershell
    git log -1
    ```

> [!TIP]
> You can run this workflow anytime you want to create a save point!
