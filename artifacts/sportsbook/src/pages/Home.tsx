import { useState } from 'react';
import { Header } from '@/components/Header';
import { SportsSidebar } from '@/components/SportsSidebar';
import { MainContent } from '@/components/MainContent';
import { BetSlip } from '@/components/BetSlip';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { useBetSlip } from '@/hooks/useBetSlip';
import { Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Home() {
  const [selectedSportId, setSelectedSportId] = useState<string | null>(null);
  const { selections } = useBetSlip();

  return (
    <div className="min-h-screen flex flex-col bg-[#111111] text-white overflow-hidden">
      <Header />
      
      <div className="flex-1 flex overflow-hidden relative">
        <SportsSidebar 
          selectedSportId={selectedSportId || ''} 
          onSelectSport={setSelectedSportId} 
        />
        
        <MainContent 
          selectedSportId={selectedSportId} 
          onSelectSport={setSelectedSportId} 
        />
        
        <BetSlip />
      </div>

      {/* Mobile Bet Slip Toggle */}
      <div className="xl:hidden fixed bottom-6 right-6 z-50">
        <Drawer>
          <DrawerTrigger asChild>
            <Button size="icon" className="h-14 w-14 rounded-full bg-[#13644B] hover:bg-[#13644B]/90 text-white shadow-xl relative group data-[state=open]:hidden">
              <Receipt className="h-6 w-6" />
              {selections.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#00DFA9] text-[#111111] text-xs font-bold h-6 w-6 rounded-full flex items-center justify-center animate-in zoom-in">
                  {selections.length}
                </span>
              )}
            </Button>
          </DrawerTrigger>
          <DrawerContent className="bg-[#1B352D] border-[#111111] h-[80vh]">
            <BetSlip className="w-full xl:flex h-full border-l-0" />
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}

export default Home;