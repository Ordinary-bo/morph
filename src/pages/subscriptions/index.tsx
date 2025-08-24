import { Card } from "antd";
import AddSubscriptions from "./components/AddSubscriptions";
import List from "./components/List";

const Subscriptions = () => {
  return (
    <div className="p-4 h-full flex flex-col">
      <Card className="mb-4">
        <AddSubscriptions />
      </Card>
      <Card className="flex-1 flex flex-col">
        <List />
      </Card>
    </div>
  );
};

export default Subscriptions;
