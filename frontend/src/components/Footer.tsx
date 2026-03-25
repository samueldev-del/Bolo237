"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from '@/components/LocaleProvider';

export default function Footer() {
  const { t, localizePath } = useLocale();

  return (
    <footer className="bg-[#FFF5EF] pt-12 pb-8 border-t border-[#FEEBD6] text-black mt-auto">
      <div className="max-w-[1400px] mx-auto px-4">
        
        {/* Grille de liens */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          <div>
            <Image src="/logo.svg" alt="Bolo237" width={120} height={32} className="h-8 w-auto mb-4" />
            <ul className="space-y-2 text-sm font-medium">
              <li><Link href={localizePath('/a-propos')} className="hover:text-[#DA7756] hover:underline">{t.footer.about}</Link></li>
              <li><Link href={localizePath('/presse')} className="hover:text-[#DA7756] hover:underline">{t.footer.press}</Link></li>
              <li><Link href={localizePath('/conditions')} className="hover:text-[#DA7756] hover:underline">CGU</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-extrabold text-black mb-4 text-[15px]">{t.footer.candidates}</h4>
            <ul className="space-y-2 text-sm font-medium">
              <li><Link href={localizePath('/dashboard')} className="hover:text-[#DA7756] hover:underline">{t.footer.my237}</Link></li>
              <li><Link href="#" className="hover:text-[#DA7756] hover:underline">{t.footer.salaryInfo}</Link></li>
              <li><Link href="#" className="hover:text-[#DA7756] hover:underline">{t.footer.careerTips}</Link></li>
              <li><Link href="#" className="hover:text-[#DA7756] hover:underline">{t.footer.cvTemplate}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-extrabold text-black mb-4 text-[15px]">{t.footer.employers}</h4>
            <ul className="space-y-2 text-sm font-medium">
              <li><Link href={localizePath('/publier')} className="hover:text-[#DA7756] hover:underline">{t.footer.post}</Link></li>
              <li><Link href={localizePath('/dashboard-entreprise')} className="hover:text-[#DA7756] hover:underline">{t.footer.employerLogin}</Link></li>
              <li><Link href="#" className="hover:text-[#DA7756] hover:underline">{t.footer.hrKnowledge}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-extrabold text-black mb-4 text-[15px]">{t.footer.follow}</h4>
            <p className="text-sm text-black mb-4 font-medium">{t.footer.feedback}</p>
            <div className="flex gap-4">
              <span className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold cursor-pointer hover:bg-[#DA7756] transition">X</span>
              <span className="w-8 h-8 bg-[#C4623F] text-white rounded-full flex items-center justify-center font-bold cursor-pointer hover:bg-[#A8502F] transition">f</span>
              <span className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold cursor-pointer hover:bg-[#DA7756] transition">in</span>
            </div>
          </div>

        </div>

        {/* Ligne de copyright */}
        <div className="text-center border-t border-gray-300 pt-8 mt-8 text-sm font-bold flex flex-col items-center gap-4">
          <p>© 2026 Bolo237. {t.footer.rights}</p>
        </div>

      </div>
    </footer>
  );
}
