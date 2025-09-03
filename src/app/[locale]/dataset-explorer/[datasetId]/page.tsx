import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

async function getDataset(id: string) {
  const dataset = await prisma.dataset.findUnique({
    where: { id },
    include: {
      template: true,
      area: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      _count: {
        select: { watchers: true },
      },
    },
  });

  return dataset;
}

const Panel = ({ id, children }: { id: string; children: React.ReactNode }) => {
  return (
    <section
      id={id}
      className="w-[32rem] flex flex-col"
      style={{ height: "calc(100vh - 64px)" }}
    >
      <div className="flex-1 overflow-hidden flex flex-col pl-6 pr-3">
        {children}
      </div>
    </section>
  );
};

const Table = ({ children }: { children: React.ReactNode }) => {
  return <table className="table-auto w-full">{children}</table>;
};

const TableRow = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => {
  return (
    <tr className="">
      <td className="font-thin py-1">{label}</td>
      <td className="font-semibold text-right">{value}</td>
    </tr>
  );
};

export default async function DatasetsV2Page({
  params,
}: {
  params: Promise<{ datasetId: string }>;
}) {
  const { datasetId } = await params;
  const dataset = await getDataset(datasetId);

  if (!dataset) {
    return notFound();
  }

  const backLinkText = "← back to datasets";
  const titleText = "in";
  const detailsTitle = "Dataset Details";
  const detailsText = "This dataset monitors";
  const featuresText = "features in";
  const periodText = ".";
  const downloadText = "Download Data";
  const mapTitle = "Map View";
  const mapDescription = "Dataset map will be displayed here";

  return (
    <div className="flex">
      <Panel id="dataset-panel">
        <div>
          <div className="text-sm text-blue-600 hover:text-blue-800 mb-4">
            {backLinkText}
          </div>

          <h2 className="text-2xl font-bold mb-4">
            {dataset.template.name} {titleText} {dataset.cityName}
          </h2>

          <div className="border-t border-gray-200 my-4"></div>

          <Table>
            <tbody>
              <TableRow label="City" value={dataset.cityName} />
              <TableRow label="Template" value={dataset.template.name} />
              <TableRow label="Category" value={dataset.template.category} />
              <TableRow label="Status" value={dataset.isActive ? "Active" : "Inactive"} />
              <TableRow label="Watchers" value={dataset._count.watchers} />
              <TableRow label="Created" value={dataset.createdAt.toLocaleDateString()} />
              {dataset.user && (
                <TableRow 
                  label="Created by" 
                  value={dataset.user.name || dataset.user.email} 
                />
              )}
            </tbody>
          </Table>

          <div className="border-t border-gray-200 my-4"></div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          <div className="p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">{detailsTitle}</h3>
            <p className="text-sm text-gray-600">
              {detailsText} {dataset.template.name.toLowerCase()} {featuresText} {dataset.cityName}{periodText}
            </p>
          </div>
        </div>

        <div className="pb-8">
          <div className="border-t border-gray-200 my-4"></div>
          <div className="mt-4 flex justify-center">
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              {downloadText}
            </button>
          </div>
        </div>
      </Panel>
      
      <div className="flex-1 bg-gray-100">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {mapTitle}
            </h2>
            <p className="text-gray-600">
              {mapDescription}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
