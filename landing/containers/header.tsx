import { IconGithub } from '@/constants/icons';
import { imageLogo } from '@/constants/images';
import Image from 'next/image';
import Link from 'next/link';

export default function Header(): JSX.Element {
  return (
    <header>
      <div className="container flex items-center justify-between my-4 lg:my-5">
        <Link href={'/'} className="flex items-center gap-2">
          {/* logo */}
          <Image src={imageLogo} width={120} height={30} alt="logo" />
        </Link>
        <div className="flex items-center gap-5">
          {/* docs */}
          <Link href={'https://killua-docs.vercel.app/'} className="text-[17px]">
            Docs
          </Link>
          {/* github */}
          <Link href={'https://github.com/sys113/killua'}>
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-c-purple">
              <IconGithub />
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
