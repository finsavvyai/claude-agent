'use client';

import React from 'react';
import { GLMVisualizer } from '../../../components/visualizer/GLMVisualizer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui';

export default function VisualizerPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-white">GLM Reasoning Engine</h1>
                <p className="text-muted-foreground">
                    Real-time visualization of the Agent's cognitive processes and Chain-of-Thought execution.
                </p>
            </div>

            <div className="grid gap-6">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Live Execution Graph</CardTitle>
                        <CardDescription>
                            Visualizing the active decision tree and context window utilization.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* The visualizer component with investor mode enabled */}
                        <GLMVisualizer investorMode={true} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
