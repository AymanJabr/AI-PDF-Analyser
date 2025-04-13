import { AlertTriangle, X } from 'lucide-react'

interface ContextLengthErrorModalProps {
    maxTokens: number
    usedTokens: number
    onClose: () => void
}

export default function ContextLengthErrorModal({
    maxTokens,
    usedTokens,
    onClose,
}: ContextLengthErrorModalProps) {
    return (
        <div className='fixed inset-0 bg-[radial-gradient(circle_at_center,_rgba(55,65,81,0.1)_0%,_rgba(17,24,39,0.6)_100%)] backdrop-blur-sm flex items-center justify-center z-50 p-4'>
            <div className='bg-white rounded-lg shadow-lg overflow-hidden max-w-md w-full'>
                <div className="flex justify-between items-center p-4 border-b">
                    <div className="flex items-center text-red-600">
                        <AlertTriangle className="h-5 w-5 mr-2" />
                        <h3 className="text-lg font-medium">Context Length Exceeded</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-5">
                    <p className="text-gray-800 mb-4">
                        Your current conversation and document require <strong>{usedTokens.toLocaleString()}</strong> tokens,
                        but the model only supports <strong>{maxTokens.toLocaleString()}</strong> tokens.
                    </p>

                    <div className="space-y-3 mb-5">
                        <h4 className="font-medium text-gray-800">Suggestions:</h4>
                        <ul className="list-disc pl-5 space-y-2 text-gray-700">
                            <li>Switch to a model with a larger context window</li>
                            <li>Try using a smaller document</li>
                        </ul>
                    </div>

                    <div className="flex justify-end">
                        <button
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                            onClick={onClose}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
} 