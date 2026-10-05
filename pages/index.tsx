import { useRouter } from "next/router";
import { useEffect } from "react";

/**
 * The prototype opens on the inbox. Redirecting client-side rather than through
 * getServerSideProps keeps the static export (GitHub Pages) buildable.
 */
const Home = () => {
  const router = useRouter();

  useEffect(() => {
    void router.replace("/inbox");
  }, [router]);

  return null;
};

export default Home;
