import React from 'react';
import {Button} from "@/components/ui/button";
import Link from "next/link";

const Banner = () => {
    return (
        <div className="relative no-scrollbar text-white">
            <div className="absolute top-0 left-0 right-0 bg-home-hero px-36 pt-52 pb-36">
                <div className="bg-overlay/50 absolute w-full top-0 left-0 bottom-0"></div>
                <div className="relative z-10 space-y-10">
                    <h1 className="text-6xl leading-tight font-bold">Unleashing Potential with Innovative Business
                        Solutions</h1>
                    <p>Transforming Visions into Reality: Your Success is Our Mission</p>
                    <Button asChild variant="secondary">
                        <Link href="/contact">Contact us today</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Banner;