import { Header } from '@/components/Header';
import { WinSpin } from '@/components/WinSpin';

export function WinSpinPage() {
  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F8FAFC] pb-14 xl:pb-0">
      <Header />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <WinSpin />
      </div>
    </div>
  );
}
