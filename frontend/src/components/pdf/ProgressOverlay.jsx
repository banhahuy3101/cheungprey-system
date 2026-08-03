import { useEffect, useState } from "react";

function toKhmerTime(seconds) {
  if (seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins} នាទី ${secs} វិនាទី`;
  }
  return `${secs} វិនាទី`;
}

export default function ProgressOverlay({ status, onCancel }) {
  const [elapsed, setElapsed] = useState(0);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (!status) return;
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [status, startTime]);

  if (!status) return null;

  const statusText =
    status === "queued"
      ? "កំពុងរង់ចាំជួរ..."
      : "កំពុងបង្កើត PDF...";
  const subText =
    elapsed > 30
      ? `${toKhmerTime(elapsed)} — សូមរង់ចាំបន្តិច`
      : toKhmerTime(elapsed);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 shadow-xl text-center min-w-[320px]">
        <div className="w-12 h-12 mx-auto mb-4 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-lg font-semibold mb-2" style={{ fontFamily: "Kantumruy Pro, sans-serif" }}>
          {statusText}
        </p>
        <p className="text-sm text-gray-500" style={{ fontFamily: "Kantumruy Pro, sans-serif" }}>
          {subText}
        </p>
        {status === "queued" && onCancel && (
          <button
            onClick={onCancel}
            className="mt-4 text-sm text-red-600 hover:text-red-800"
            style={{ fontFamily: "Kantumruy Pro, sans-serif" }}
          >
            បោះបង់
          </button>
        )}
      </div>
    </div>
  );
}
