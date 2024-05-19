"use client"
import React from 'react';
import {useAppDispatch, useAppSelector} from "@/store/hooks";
import {Button} from "@/components/ui/button";
import {decrement, increment} from "@/app/_features/counter/counterSlice";

const Counter = () => {
    // @ts-ignore
    const count = useAppSelector((state) => state.counter);
    const dispatch = useAppDispatch();

    return (
        <div>
            {/*<h2>{count}</h2>*/}
            <div>
                {/*// @ts-ignore*/}
                <Button onClick={() => dispatch(increment)}>Increment + 1</Button>
                {/*// @ts-ignore*/}
                <Button onClick={() => dispatch(decrement)}>Decrement - 1</Button>
            </div>
        </div>
    );
};

export default Counter;