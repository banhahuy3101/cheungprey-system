import { useEffect, useState } from "react";
import { reportDocumentsAPI } from "../../api/reportDocuments";
import ReportSimpleForm from "./ReportSimpleForm";

export default function ReportDetail({ mode, reportId }) {
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(null);

  useEffect(() => {
    if (!reportId) return;
    let cancelled = false;
    setLoading(true);
    reportDocumentsAPI
      .getById(reportId)
      .then((res) => {
        if (cancelled) return;
        setDoc(res.data?.data ?? res.data);
      })
      .catch(() => {
        if (!cancelled) setDoc(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  if (loading) {
    return <div className="loading">កំពុងផ្ទុក...</div>;
  }

  if (!doc) {
    return (
      <div className="page report-page">
        <div className="alert alert-error report-flash">រកមិនឃើញរបាយការណ៍</div>
      </div>
    );
  }

  return <ReportSimpleForm mode={mode} reportId={reportId} initialDoc={doc} />;
}
