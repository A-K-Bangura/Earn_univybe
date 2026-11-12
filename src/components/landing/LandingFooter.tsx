import { Link } from "react-router-dom";
import { LandingImg } from "./LandingImg";
import { pickImage } from "./landingAssets";
import { COURSES_ROUTE, LOGIN_ROUTE, SIGNUP_ROUTE } from "./landingSections";

const links = [
  { to: COURSES_ROUTE, label: "Courses" },
  { to: "/feed", label: "Feed" },
  { to: LOGIN_ROUTE, label: "Log in" },
  { to: SIGNUP_ROUTE, label: "Sign up" },
];

export const LandingFooter = () => (
  <footer className="bg-gray-900 py-10 text-gray-300">
    <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 sm:px-8 md:flex-row">
      <div className="flex flex-col items-center gap-2 md:items-start">
        <LandingImg
          image={pickImage("logo-word-white")}
          alt="UniVybe"
          className="h-9 w-auto"
        />
        <p className="text-sm">A new vibe for learning and student life.</p>
      </div>
      <nav aria-label="Footer">
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {links.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className="rounded-md font-bold text-gray-300 transition-colors hover:text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
    <p className="mx-auto mt-8 max-w-7xl px-5 text-center text-xs text-gray-400 sm:px-8 md:text-left">
      © {new Date().getFullYear()} UniVybe. All rights reserved.
    </p>
  </footer>
);
