import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PrivacyAssuranceModal } from "../components/privacy/PrivacyAssuranceModal";

type StudentPrivacyContextValue = {
  openPrivacyAssurance: () => void;
  closePrivacyAssurance: () => void;
};

const StudentPrivacyContext = createContext<
  StudentPrivacyContextValue | undefined
>(undefined);

export function StudentPrivacyProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  const openPrivacyAssurance = useCallback(() => {
    setVisible(true);
  }, []);

  const closePrivacyAssurance = useCallback(() => {
    setVisible(false);
  }, []);

  const value = useMemo(
    () => ({ openPrivacyAssurance, closePrivacyAssurance }),
    [openPrivacyAssurance, closePrivacyAssurance],
  );

  return (
    <StudentPrivacyContext.Provider value={value}>
      {children}
      <PrivacyAssuranceModal visible={visible} onClose={closePrivacyAssurance} />
    </StudentPrivacyContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStudentPrivacy(): StudentPrivacyContextValue {
  const ctx = useContext(StudentPrivacyContext);
  if (!ctx) {
    throw new Error(
      "useStudentPrivacy must be used within StudentPrivacyProvider",
    );
  }
  return ctx;
}
