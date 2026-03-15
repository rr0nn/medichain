import Image from "next/image";
import styled from "styled-components";

const ReasoningPage = styled.div`
  width: 100%;
  min-height: 100vh;
  text-align: center;
  background-color: #f2fff5;

  display: flex;
  flex-direction: column;
  align-items: center;
`;


const Header = styled.div`
  width: 100%;
  height: 120px;
  text-align: center;
  background-color: #ffffff;
  border-bottom: 3.5px solid #253d2c;
  box-shadow: 0px 7px 10px rgba(0, 0, 0, 0.3);

  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

export default function Home() {
  

  return (
    <ReasoningPage>
      <Header>
        <Image
          src="/medichainLogo.png"
          alt="Medichain logo"
          width={200}
          height={200}
          style={{ position: "absolute", marginRight: "80%" }}
        />
      </Header>
    </ReasoningPage>
  );
}
