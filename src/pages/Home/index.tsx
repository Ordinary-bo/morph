import { Link } from "react-router";

const Home = () => {
  return (
    <div>
      Home  <Link to="/subscriptions">Go to Subscriptions</Link>
    </div>
  );
};
export default Home;