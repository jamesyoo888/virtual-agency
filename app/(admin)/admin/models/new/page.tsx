import ModelWizard from "@/components/model-wizard";

export default function NewModelPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">New Model</h1>
        <p className="text-zinc-400 mt-1">버추얼 모델 생성</p>
      </div>
      <ModelWizard />
    </div>
  );
}
