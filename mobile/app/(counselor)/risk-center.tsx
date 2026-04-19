/**
 * Legacy route: Prioritized cases now live under Student Directory.
 * Deep links and old bookmarks redirect here.
 */

import { Redirect, useGlobalSearchParams } from 'expo-router';

export default function CounselorRiskCenterRedirect() {
    const { studentId } = useGlobalSearchParams<{ studentId?: string }>();
    if (typeof studentId === 'string' && studentId.length > 0) {
        return (
            <Redirect
                href={{
                    pathname: '/(counselor)/students',
                    params: { openStudentId: studentId },
                }}
            />
        );
    }
    return <Redirect href="/(counselor)/students" />;
}
