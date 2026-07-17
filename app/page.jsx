import LabApp from "./LabApp";
import MachineTarget from "./MachineTarget";

// LAB_MACHINE env set ise: tek-zafiyet hedef makinesi; değilse: er0s3c kontrol paneli.
export default function Page() {
  const slug = process.env.LAB_MACHINE;
  const level = process.env.LAB_FORCE_LEVEL || "low";
  const panelOrigin = process.env.PANEL_ORIGIN || "";
  if (slug) return <MachineTarget slug={slug} level={level} panelOrigin={panelOrigin} />;
  return <LabApp />;
}
