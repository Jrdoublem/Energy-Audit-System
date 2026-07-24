import AppLayout from '../layouts/AppLayout';

function Placeholder({ title }) {
  return (
    <AppLayout title={title}>
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">กำลังพัฒนา...</div>
    </AppLayout>
  );
}

export default Placeholder;
