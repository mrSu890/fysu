import { Suspense } from "react";
import SuccessClient from "./SuccessClient";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function SuccessPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<div className="min-h-[100svh]" />}>
        <SuccessClient />
      </Suspense>
      <Footer />
    </>
  );
}
