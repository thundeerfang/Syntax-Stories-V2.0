'use client';

import type { ComponentType } from 'react';
import { Github } from 'lucide-react';

export { Github as GithubIcon } from 'lucide-react';

type IconProps = { className?: string };

export function GoogleIcon({ className }: IconProps) {
  return (
    <svg className={className} xmlSpace="preserve" overflow="hidden" viewBox="0 0 268.152 273.883">
      <defs>
        <linearGradient id="google__a"><stop offset="0" stopColor="#0fbc5c"/><stop offset="1" stopColor="#0cba65"/></linearGradient>
        <linearGradient id="google__g"><stop offset=".231" stopColor="#0fbc5f"/><stop offset=".312" stopColor="#0fbc5f"/><stop offset=".366" stopColor="#0fbc5e"/><stop offset=".458" stopColor="#0fbc5d"/><stop offset=".54" stopColor="#12bc58"/><stop offset=".699" stopColor="#28bf3c"/><stop offset=".771" stopColor="#38c02b"/><stop offset=".861" stopColor="#52c218"/><stop offset=".915" stopColor="#67c30f"/><stop offset="1" stopColor="#86c504"/></linearGradient>
        <linearGradient id="google__h"><stop offset=".142" stopColor="#1abd4d"/><stop offset=".248" stopColor="#6ec30d"/><stop offset=".312" stopColor="#8ac502"/><stop offset=".366" stopColor="#a2c600"/><stop offset=".446" stopColor="#c8c903"/><stop offset=".54" stopColor="#ebcb03"/><stop offset=".616" stopColor="#f7cd07"/><stop offset=".699" stopColor="#fdcd04"/><stop offset=".771" stopColor="#fdce05"/><stop offset=".861" stopColor="#ffce0a"/></linearGradient>
        <linearGradient id="google__f"><stop offset=".316" stopColor="#ff4c3c"/><stop offset=".604" stopColor="#ff692c"/><stop offset=".727" stopColor="#ff7825"/><stop offset=".885" stopColor="#ff8d1b"/><stop offset="1" stopColor="#ff9f13"/></linearGradient>
        <linearGradient id="google__b"><stop offset=".231" stopColor="#ff4541"/><stop offset=".312" stopColor="#ff4540"/><stop offset=".458" stopColor="#ff4640"/><stop offset=".54" stopColor="#ff473f"/><stop offset=".699" stopColor="#ff5138"/><stop offset=".771" stopColor="#ff5b33"/><stop offset=".861" stopColor="#ff6c29"/><stop offset="1" stopColor="#ff8c18"/></linearGradient>
        <linearGradient id="google__d"><stop offset=".408" stopColor="#fb4e5a"/><stop offset="1" stopColor="#ff4540"/></linearGradient>
        <linearGradient id="google__c"><stop offset=".132" stopColor="#0cba65"/><stop offset=".21" stopColor="#0bb86d"/><stop offset=".297" stopColor="#09b479"/><stop offset=".396" stopColor="#08ad93"/><stop offset=".477" stopColor="#0aa6a9"/><stop offset=".568" stopColor="#0d9cc6"/><stop offset=".667" stopColor="#1893dd"/><stop offset=".769" stopColor="#258bf1"/><stop offset=".859" stopColor="#3086ff"/></linearGradient>
        <linearGradient id="google__e"><stop offset=".366" stopColor="#ff4e3a"/><stop offset=".458" stopColor="#ff8a1b"/><stop offset=".54" stopColor="#ffa312"/><stop offset=".616" stopColor="#ffb60c"/><stop offset=".771" stopColor="#ffcd0a"/><stop offset=".861" stopColor="#fecf0a"/><stop offset=".915" stopColor="#fecf08"/><stop offset="1" stopColor="#fdcd01"/></linearGradient>
        <linearGradient xlinkHref="#google__a" id="google__s" x1="219.7" x2="254.467" y1="329.535" y2="329.535" gradientUnits="userSpaceOnUse"/>
        <radialGradient xlinkHref="#google__b" id="google__m" cx="109.627" cy="135.862" r="71.46" fx="109.627" fy="135.862" gradientTransform="matrix(-1.93688 1.043 1.45573 2.55542 290.525 -400.634)" gradientUnits="userSpaceOnUse"/>
        <radialGradient xlinkHref="#google__c" id="google__n" cx="45.259" cy="279.274" r="71.46" fx="45.259" fy="279.274" gradientTransform="matrix(-3.5126 -4.45809 -1.69255 1.26062 870.8 191.554)" gradientUnits="userSpaceOnUse"/>
        <radialGradient xlinkHref="#google__d" id="google__l" cx="304.017" cy="118.009" r="47.854" fx="304.017" fy="118.009" gradientTransform="matrix(2.06435 0 0 2.59204 -297.679 -151.747)" gradientUnits="userSpaceOnUse"/>
        <radialGradient xlinkHref="#google__e" id="google__o" cx="181.001" cy="177.201" r="71.46" fx="181.001" fy="177.201" gradientTransform="matrix(-.24858 2.08314 2.96249 .33417 -255.146 -331.164)" gradientUnits="userSpaceOnUse"/>
        <radialGradient xlinkHref="#google__f" id="google__p" cx="207.673" cy="108.097" r="41.102" fx="207.673" fy="108.097" gradientTransform="matrix(-1.2492 1.34326 -3.89684 -3.4257 880.501 194.905)" gradientUnits="userSpaceOnUse"/>
        <radialGradient xlinkHref="#google__g" id="google__r" cx="109.627" cy="135.862" r="71.46" fx="109.627" fy="135.862" gradientTransform="matrix(-1.93688 -1.043 1.45573 -2.55542 290.525 838.683)" gradientUnits="userSpaceOnUse"/>
        <radialGradient xlinkHref="#google__h" id="google__j" cx="154.87" cy="145.969" r="71.46" fx="154.87" fy="145.969" gradientTransform="matrix(-.0814 -1.93722 2.92674 -.11625 -215.135 632.86)" gradientUnits="userSpaceOnUse"/>
        <filter id="google__q" width="1.097" height="1.116" x="-.048" y="-.058" colorInterpolationFilters="sRGB"><feGaussianBlur stdDeviation="1.701"/></filter>
        <filter id="google__k" width="1.033" height="1.02" x="-.017" y="-.01" colorInterpolationFilters="sRGB"><feGaussianBlur stdDeviation=".242"/></filter>
        <clipPath id="google__i" clipPathUnits="userSpaceOnUse"><path d="M371.378 193.24H237.083v53.438h77.167c-1.241 7.563-4.026 15.003-8.105 21.786-4.674 7.773-10.451 13.69-16.373 18.196-17.74 13.498-38.42 16.258-52.783 16.258-36.283 0-67.283-23.286-79.285-54.928-.484-1.149-.805-2.335-1.197-3.507a81.115 81.115 0 0 1-4.101-25.448c0-9.226 1.569-18.057 4.43-26.398 11.285-32.897 42.985-57.467 80.179-57.467 7.481 0 14.685.884 21.517 2.648a77.668 77.668 0 0 1 33.425 18.25l40.834-39.712c-24.839-22.616-57.219-36.32-95.844-36.32-30.878 0-59.386 9.553-82.748 25.7-18.945 13.093-34.483 30.625-44.97 50.985-9.753 18.879-15.094 39.8-15.094 62.294 0 22.495 5.35 43.633 15.103 62.337v.126c10.302 19.857 25.368 36.954 43.678 49.988 15.997 11.386 44.68 26.551 84.031 26.551 22.63 0 42.687-4.051 60.375-11.644 12.76-5.478 24.065-12.622 34.301-21.804 13.525-12.132 24.117-27.139 31.347-44.404 7.23-17.265 11.097-36.79 11.097-57.957 0-9.858-.998-19.87-2.689-28.968Z"/></clipPath>
      </defs>
      <g clipPath="url(#google__i)" transform="matrix(.95792 0 0 .98525 -90.174 -78.856)">
        <path fill="url(#google__j)" d="M92.076 219.958c.148 22.14 6.501 44.983 16.117 63.424v.127c6.949 13.392 16.445 23.97 27.26 34.452l65.327-23.67c-12.36-6.235-14.246-10.055-23.105-17.026-9.054-9.066-15.802-19.473-20.004-31.677h-.17l.17-.127c-2.765-8.058-3.037-16.613-3.14-25.503Z" filter="url(#google__k)"/>
        <path fill="url(#google__l)" d="M237.083 79.025c-6.456 22.526-3.988 44.421 0 57.161 7.457.006 14.64.888 21.45 2.647a77.662 77.662 0 0 1 33.424 18.25l41.88-40.726c-24.81-22.59-54.667-37.297-96.754-37.332Z" filter="url(#google__k)"/>
        <path fill="url(#google__m)" d="M236.943 78.847c-31.67 0-60.91 9.798-84.871 26.359a145.533 145.533 0 0 0-24.332 21.15c-1.904 17.744 14.257 39.551 46.262 39.37 15.528-17.936 38.495-29.542 64.056-29.542l.07.002-1.044-57.335c-.048 0-.093-.004-.14-.004Z" filter="url(#google__k)"/>
        <path fill="url(#google__n)" d="m341.475 226.379-28.268 19.285c-1.24 7.562-4.028 15.002-8.107 21.786-4.674 7.772-10.45 13.69-16.373 18.196-17.702 13.47-38.328 16.244-52.687 16.255-14.842 25.102-17.444 37.675 1.043 57.934 22.877-.016 43.157-4.117 61.046-11.796 12.931-5.551 24.388-12.792 34.761-22.097 13.706-12.295 24.442-27.503 31.769-45 7.327-17.497 11.245-37.282 11.245-58.734Z" filter="url(#google__k)"/>
        <path fill="#3086ff" d="M234.996 191.21v57.498h136.006c1.196-7.874 5.152-18.064 5.152-26.5 0-9.858-.996-21.899-2.687-30.998Z" filter="url(#google__k)"/>
        <path fill="url(#google__o)" d="M128.39 124.327c-8.394 9.119-15.564 19.326-21.249 30.364-9.753 18.879-15.094 41.83-15.094 64.324 0 .317.026.627.029.944 4.32 8.224 59.666 6.649 62.456 0-.004-.31-.039-.613-.039-.924 0-9.226 1.57-16.026 4.43-24.367 3.53-10.289 9.056-19.763 16.123-27.926 1.602-2.031 5.875-6.397 7.121-9.016.475-.997-.862-1.557-.937-1.908-.083-.393-1.876-.077-2.277-.37-1.275-.929-3.8-1.414-5.334-1.845-3.277-.921-8.708-2.953-11.725-5.06-9.536-6.658-24.417-14.612-33.505-24.216Z" filter="url(#google__k)"/>
        <path fill="url(#google__p)" d="M162.099 155.857c22.112 13.301 28.471-6.714 43.173-12.977l-25.574-52.664a144.74 144.74 0 0 0-26.543 14.504c-12.316 8.512-23.192 18.9-32.176 30.72Z" filter="url(#google__q)"/>
        <path fill="url(#google__r)" d="M171.099 290.222c-29.683 10.641-34.33 11.023-37.062 29.29a144.806 144.806 0 0 0 16.792 13.984c15.996 11.386 46.766 26.551 86.118 26.551.046 0 .09-.004.137-.004v-59.157l-.094.002c-14.736 0-26.512-3.843-38.585-10.527-2.977-1.648-8.378 2.777-11.123.799-3.786-2.729-12.9 2.35-16.183-.938Z" filter="url(#google__k)"/>
        <path fill="url(#google__s)" d="M219.7 299.023v59.996c5.506.64 11.236 1.028 17.247 1.028 6.026 0 11.855-.307 17.52-.872v-59.748a105.119 105.119 0 0 1-17.477 1.461c-5.932 0-11.7-.686-17.29-1.865Z" filter="url(#google__k)" opacity=".5"/>
      </g>
    </svg>
  );
}

export function FacebookIcon({ className }: IconProps) {
  return (
    <svg className={className} preserveAspectRatio="xMidYMid" viewBox="0 0 256 171">
      <defs>
        <linearGradient id="meta__a" x1="13.878%" x2="89.144%" y1="55.934%" y2="58.694%"><stop offset="0%" stopColor="#0064E1"/><stop offset="40%" stopColor="#0064E1"/><stop offset="83%" stopColor="#0073EE"/><stop offset="100%" stopColor="#0082FB"/></linearGradient>
        <linearGradient id="meta__b" x1="54.315%" x2="54.315%" y1="82.782%" y2="39.307%"><stop offset="0%" stopColor="#0082FB"/><stop offset="100%" stopColor="#0064E0"/></linearGradient>
      </defs>
      <path fill="#0081FB" d="M27.651 112.136c0 9.775 2.146 17.28 4.95 21.82 3.677 5.947 9.16 8.466 14.751 8.466 7.211 0 13.808-1.79 26.52-19.372 10.185-14.092 22.186-33.874 30.26-46.275l13.675-21.01c9.499-14.591 20.493-30.811 33.1-41.806C161.196 4.985 172.298 0 183.47 0c18.758 0 36.625 10.87 50.3 31.257C248.735 53.584 256 81.707 256 110.729c0 17.253-3.4 29.93-9.187 39.946-5.591 9.686-16.488 19.363-34.818 19.363v-27.616c15.695 0 19.612-14.422 19.612-30.927 0-23.52-5.484-49.623-17.564-68.273-8.574-13.23-19.684-21.313-31.907-21.313-13.22 0-23.859 9.97-35.815 27.75-6.356 9.445-12.882 20.956-20.208 33.944l-8.066 14.289c-16.203 28.728-20.307 35.271-28.408 46.07-14.2 18.91-26.324 26.076-42.287 26.076-18.935 0-30.91-8.2-38.325-20.556C2.973 139.413 0 126.202 0 111.148l27.651.988Z"/>
      <path fill="url(#meta__a)" d="M21.802 33.206C34.48 13.666 52.774 0 73.757 0 85.91 0 97.99 3.597 110.605 13.897c13.798 11.261 28.505 29.805 46.853 60.368l6.58 10.967c15.881 26.459 24.917 40.07 30.205 46.49 6.802 8.243 11.565 10.7 17.752 10.7 15.695 0 19.612-14.422 19.612-30.927l24.393-.766c0 17.253-3.4 29.93-9.187 39.946-5.591 9.686-16.488 19.363-34.818 19.363-11.395 0-21.49-2.475-32.654-13.007-8.582-8.083-18.615-22.443-26.334-35.352l-22.96-38.352C118.528 64.08 107.96 49.73 101.845 43.23c-6.578-6.988-15.036-15.428-28.532-15.428-10.923 0-20.2 7.666-27.963 19.39L21.802 33.206Z"/>
      <path fill="url(#meta__b)" d="M73.312 27.802c-10.923 0-20.2 7.666-27.963 19.39-10.976 16.568-17.698 41.245-17.698 64.944 0 9.775 2.146 17.28 4.95 21.82L9.027 149.482C2.973 139.413 0 126.202 0 111.148 0 83.772 7.514 55.24 21.802 33.206 34.48 13.666 52.774 0 73.757 0l-.445 27.802Z"/>
    </svg>
  );
}

export function XIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/** Public path to the Discord mark (`public/icons/discord.svg`). */
export const ICON_DISCORD = '/icons/discord.svg';

/** Discord mark — asset lives at `public/icons/discord.svg`. */
export function DiscordIcon({ className }: IconProps) {
  return <img src={ICON_DISCORD} alt="" className={className} />;
}

/** Map of provider id → icon component for auth dialog and settings connected accounts */
export const PROVIDER_ICONS: Record<string, ComponentType<IconProps>> = {
  google: GoogleIcon,
  github: Github,
  facebook: FacebookIcon,
  x: XIcon,
  discord: DiscordIcon,
};
